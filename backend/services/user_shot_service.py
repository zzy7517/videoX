"""用户分镜服务
包含所有用户分镜相关的业务逻辑和数据库操作
"""
from .. import models
from sqlalchemy.orm import Session
from fastapi import HTTPException
from ..logger import setup_logger, log_exception
import json
from datetime import datetime, timezone

# 设置日志
logger = setup_logger("backend.services.user_shot_service")

def get_user_shots_order(db: Session, user_id:int, project_id:int=None):
    """
    获取用户分镜顺序
    
    Args:
        db: 数据库会话
        user_id: 用户ID
        project_id: 项目ID，必须提供
        
    Returns:
        用户分镜顺序对象
    """
    # 如果没有提供project_id，返回400错误
    if project_id is None:
        logger.error(f"用户 {user_id} 尝试获取分镜顺序但未提供project_id")
        raise HTTPException(status_code=400, detail="必须提供项目ID")
        
    logger.info(f"正在获取用户 {user_id} 项目 {project_id} 的分镜顺序")
    
    # 查询用户分镜顺序，使用user_id和project_id进行精确匹配
    query = db.query(models.UserShot).filter(
        models.UserShot.user_id == user_id,
        models.UserShot.project_id == project_id
    )
    
    user_shot = query.first()
    
    # 如果不存在，创建一个新的空顺序
    if not user_shot:
        logger.info(f"用户 {user_id} 项目 {project_id} 的分镜顺序记录不存在，将创建新记录")
        
        # 先查询数据库中是否存在用户记录
        user_exists = db.query(models.User).filter(models.User.user_id == user_id).first() is not None
        if not user_exists:
            logger.error(f"用户 {user_id} 不存在，无法创建分镜顺序记录")
            raise HTTPException(status_code=404, detail=f"用户 ID {user_id} 不存在")
        
        user_shot = models.UserShot(
            user_id=user_id,
            project_id=project_id,
            shots_order={},
            script="",
            characters={}
        )
        db.add(user_shot)
        
        try:
            db.flush()  # 先尝试flush确保没有冲突
            db.commit()
            db.refresh(user_shot)
            logger.info(f"已成功创建用户 {user_id} 项目 {project_id} 的分镜顺序记录")
        except Exception as e:
            db.rollback()
            log_exception(logger, f"创建用户分镜顺序记录失败: {str(e)}")
            # 如果提交失败，可能是因为并发问题，再次尝试获取
            user_shot = db.query(models.UserShot).filter(
                models.UserShot.user_id == user_id,
                models.UserShot.project_id == project_id
            ).first()
            if not user_shot:
                raise HTTPException(status_code=500, detail="创建分镜顺序记录失败")
    
    return user_shot

def get_ordered_shots(db: Session, user_id: int, project_id: int=None):
    """
    获取按顺序排列的用户分镜
    
    Args:
        db: 数据库会话
        user_id: 用户ID
        project_id: 项目ID，必须提供
        
    Returns:
        按顺序排列的分镜列表
    """
    # 如果没有提供project_id，返回400错误
    if project_id is None:
        logger.error(f"用户 {user_id} 尝试获取排序分镜但未提供project_id")
        raise HTTPException(status_code=400, detail="必须提供项目ID")
    
    logger.info(f"正在获取用户 {user_id} 项目 {project_id} 的所有分镜 (按顺序)")
    
    try:
        # 获取用户分镜顺序
        user_shot = get_user_shots_order(db, user_id, project_id)
        shots_order = user_shot.shots_order
        
        # 如果顺序为空，直接返回空列表
        if not shots_order:
            logger.info(f"用户 {user_id} 项目 {project_id} 没有分镜顺序记录，返回空列表")
            return []
        
        # 获取顺序中指定的分镜ID列表
        shot_ids = [int(shot_id) for shot_id in shots_order.keys()]
        
        # 根据ID列表查询分镜
        all_shots = db.query(models.Shot).filter(models.Shot.shot_id.in_(shot_ids)).all()
        logger.info(f"成功获取 {len(all_shots)} 个分镜")
        
        # 如果查询到的分镜数量与顺序不一致，说明有分镜被删除但顺序未更新，需要重建顺序
        if len(all_shots) != len(shots_order):
            logger.info("分镜数量与顺序不一致，将重建顺序")
            shots_order = rebuild_shots_order(db, all_shots, user_id, project_id)
        
        # 创建ID到分镜对象的映射字典
        shot_dict = {str(shot.shot_id): shot for shot in all_shots}
        ordered_shots = []
        
        # 按顺序添加分镜
        for shot_id_str, order in sorted(shots_order.items(), key=lambda x: x[1]):
            if shot_id_str in shot_dict:
                shot = shot_dict[shot_id_str]
                # 动态添加order属性
                shot.order = order
                ordered_shots.append(shot)
            else:
                # 移除不存在的分镜ID
                logger.warning(f"分镜ID {shot_id_str} 在顺序中存在但在数据库中不存在，将从顺序中移除")
                shots_order.pop(shot_id_str, None)
        
        # 如果有分镜被移除，更新数据库中的顺序
        if len(ordered_shots) != len(shots_order):
            user_shot = get_user_shots_order(db, user_id, project_id)
            user_shot.shots_order = {str(shot.shot_id): shot.order for shot in ordered_shots}
            db.commit()
        
        logger.info(f"成功获取 {len(ordered_shots)} 个已排序分镜")
        return ordered_shots
        
    except Exception as e:
        log_exception(logger, f"获取排序分镜失败: {str(e)}")
        # 返回空列表而不是抛出异常
        logger.info("由于错误，返回空列表作为后备")
        return []


def rebuild_shots_order(db: Session, shots, user_id:int, project_id:int=None):
    """
    重建用户分镜顺序，根据分镜的更新时间排序
    
    Args:
        db: 数据库会话
        shots: 分镜列表（应该只包含当前用户的分镜）
        user_id: 用户ID
        project_id: 项目ID，必须提供
        
    Returns:
        更新后的顺序字典
    """
    # 如果没有提供project_id，返回400错误
    if project_id is None:
        logger.error(f"用户 {user_id} 尝试重建分镜顺序但未提供project_id")
        raise HTTPException(status_code=400, detail="必须提供项目ID")
    
    logger.info(f"正在为用户 {user_id} 项目 {project_id} 重建分镜顺序，共 {len(shots)} 个分镜")
    
    try:
        # 根据更新时间排序分镜
        sorted_shots = sorted(shots, key=lambda shot: shot.updated_at)
        
        # 创建新的顺序字典
        new_order = {}
        for i, shot in enumerate(sorted_shots):
            new_order[str(shot.shot_id)] = i + 1
        
        # 获取用户分镜顺序记录
        user_shot = get_user_shots_order(db, user_id, project_id)
        
        # 更新顺序
        user_shot.shots_order = new_order
        db.commit()
        
        logger.info(f"成功重建分镜顺序，共 {len(new_order)} 个分镜")
        return new_order
        
    except Exception as e:
        db.rollback()
        log_exception(logger, f"重建分镜顺序失败: {str(e)}")
        raise HTTPException(status_code=500, detail="重建分镜顺序失败")

def add_shot_to_order(db: Session, shot_id: int, position: str = "end", reference_shot_id: int = None, user_id:int=None, project_id:int=None):
    """
    将分镜添加到用户顺序中
    
    Args:
        db: 数据库会话
        shot_id: 要添加的分镜ID
        position: 添加位置("end", "above", "below")
        reference_shot_id: 参考分镜ID（如果position不是"end"）
        user_id: 用户ID
        project_id: 项目ID，必须提供
        
    Returns:
        更新后的顺序字典
    """
    # 如果没有提供project_id，返回400错误
    if project_id is None:
        logger.error(f"用户 {user_id} 尝试添加分镜 {shot_id} 到顺序但未提供project_id")
        raise HTTPException(status_code=400, detail="必须提供项目ID")
    
    logger.info(f"正在将分镜 {shot_id} 添加到用户 {user_id} 项目 {project_id} 的顺序中，位置: {position}")
    
    try:
        # 获取用户分镜顺序 - 确保使用user_id和project_id来精确匹配
        query = db.query(models.UserShot).filter(
            models.UserShot.user_id == user_id,
            models.UserShot.project_id == project_id
        )
        
        user_shot = query.first()
        
        # 如果不存在，创建一个新的
        if not user_shot:
            logger.info(f"用户 {user_id} 项目 {project_id} 的分镜顺序记录不存在，将创建新记录")
            user_shot = models.UserShot(
                user_id=user_id,
                project_id=project_id,
                shots_order={},
                script="",
                characters={}
            )
            db.add(user_shot)
            db.flush()  # 确保实体已添加到数据库会话但尚未提交
        
        shots_order = user_shot.shots_order.copy()
        
        # 如果顺序为空，直接添加为第一个
        if not shots_order:
            shots_order[str(shot_id)] = 1
            user_shot.shots_order = shots_order
            db.commit()
            return shots_order
        
        # 根据位置添加
        if position == "end":
            # 添加到末尾
            max_order = max(shots_order.values())
            shots_order[str(shot_id)] = max_order + 1
        else:
            # 添加到参考分镜前/后
            if not reference_shot_id:
                raise HTTPException(status_code=400, detail="添加分镜到指定位置需要参考分镜ID")
            
            ref_shot_id_str = str(reference_shot_id)
            if ref_shot_id_str not in shots_order:
                raise HTTPException(status_code=404, detail=f"找不到参考分镜 ID {reference_shot_id}")
            
            ref_order = shots_order[ref_shot_id_str]
            
            # 确定新分镜的顺序
            new_order = ref_order
            if position == "below":
                new_order = ref_order + 1
            
            # 调整其他分镜的顺序
            for s_id, order in shots_order.items():
                if position == "above" and order >= new_order:
                    shots_order[s_id] = order + 1
                elif position == "below" and order > ref_order:
                    shots_order[s_id] = order + 1
            
            # 添加新分镜
            shots_order[str(shot_id)] = new_order
        
        # 更新数据库
        user_shot.shots_order = shots_order
        db.commit()
        
        logger.info(f"成功将分镜 {shot_id} 添加到顺序中，新顺序包含 {len(shots_order)} 个分镜")
        return shots_order
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        log_exception(logger, f"添加分镜到顺序失败: {str(e)}")
        raise HTTPException(status_code=500, detail="添加分镜到顺序失败")

def remove_shot_from_order(db: Session, shot_id: int, user_id: int, project_id:int=None):
    """
    从用户顺序中移除分镜
    
    Args:
        db: 数据库会话
        shot_id: 要移除的分镜ID
        user_id: 用户ID
        project_id: 项目ID，必须提供
        
    Returns:
        更新后的顺序字典
    """
    # 如果没有提供project_id，返回400错误
    if project_id is None:
        logger.error(f"用户 {user_id} 尝试从顺序中移除分镜 {shot_id} 但未提供project_id")
        raise HTTPException(status_code=400, detail="必须提供项目ID")
    
    logger.info(f"正在从用户 {user_id} 项目 {project_id} 的顺序中移除分镜 {shot_id}")
    
    try:
        # 获取用户分镜顺序
        user_shot = get_user_shots_order(db, user_id, project_id)
        shots_order = user_shot.shots_order.copy()
        
        shot_id_str = str(shot_id)
        if shot_id_str not in shots_order:
            logger.warning(f"分镜 {shot_id} 不在顺序中，无需移除")
            return shots_order
        
        # 获取被移除分镜的顺序
        removed_order = shots_order[shot_id_str]
        
        # 移除分镜
        del shots_order[shot_id_str]
        
        # 调整其他分镜的顺序
        for s_id, order in shots_order.items():
            if order > removed_order:
                shots_order[s_id] = order - 1
        
        # 更新数据库
        user_shot.shots_order = shots_order
        db.commit()
        
        logger.info(f"成功从顺序中移除分镜 {shot_id}，新顺序包含 {len(shots_order)} 个分镜")
        return shots_order
        
    except Exception as e:
        db.rollback()
        log_exception(logger, f"从顺序中移除分镜失败: {str(e)}")
        raise HTTPException(status_code=500, detail="从顺序中移除分镜失败")

def set_shot_order(db: Session, shot_order_mapping: dict, user_id: int, project_id:int=None):
    """
    直接设置用户分镜顺序
    
    Args:
        db: 数据库会话
        shot_order_mapping: 分镜ID到顺序的映射字典，形如 {"1": 1, "2": 2, ...}
        user_id: 用户ID
        project_id: 项目ID，必须提供
        
    Returns:
        更新后的顺序字典
    """
    # 如果没有提供project_id，返回400错误
    if project_id is None:
        logger.error(f"用户 {user_id} 尝试设置分镜顺序但未提供project_id")
        raise HTTPException(status_code=400, detail="必须提供项目ID")
    
    logger.info(f"正在为用户 {user_id} 项目 {project_id} 设置分镜顺序，共 {len(shot_order_mapping)} 个分镜")
    
    try:
        # 获取用户分镜顺序
        user_shot = get_user_shots_order(db, user_id, project_id)
        
        # 直接设置新的顺序
        user_shot.shots_order = shot_order_mapping
        db.commit()
        
        logger.info(f"成功设置用户 {user_id} 项目 {project_id} 的分镜顺序，共 {len(shot_order_mapping)} 个分镜")
        return shot_order_mapping
        
    except Exception as e:
        db.rollback()
        log_exception(logger, f"设置分镜顺序失败: {str(e)}")
        raise HTTPException(status_code=500, detail="设置分镜顺序失败")

def update_script(db: Session, script: str, user_id: int, project_id: int = None):
    """
    更新用户项目的剧本内容
    
    Args:
        db: 数据库会话
        script: 剧本内容
        user_id: 用户ID
        project_id: 项目ID，必须提供
        
    Returns:
        更新后的UserShot对象
    """
    # 如果没有提供project_id，返回400错误
    if project_id is None:
        logger.error(f"用户 {user_id} 尝试更新剧本但未提供project_id")
        raise HTTPException(status_code=400, detail="必须提供项目ID")
    
    logger.info(f"用户 {user_id} 正在更新项目 {project_id} 的剧本")
    
    # 详细记录传入的参数
    if script is None:
        logger.warning(f"用户 {user_id} 提供的剧本内容为None，将使用空字符串")
        script = ""
    else:
        try:
            script_type = type(script).__name__
            script_length = len(str(script)) if script is not None else 0
            logger.debug(f"剧本内容类型: {script_type}, 内容长度: {script_length}")
            if script_length > 100:
                logger.debug(f"剧本内容前100字符: {str(script)[:100]}...")
        except Exception as e:
            logger.error(f"尝试记录剧本内容信息时出错: {str(e)}")
    
    # 确保script是字符串类型
    if not isinstance(script, str):
        try:
            logger.warning(f"剧本内容不是字符串，类型为: {type(script).__name__}，尝试转换为字符串")
            script = str(script)
            logger.warning(f"剧本内容已自动转换为字符串，长度: {len(script)}")
        except Exception as e:
            log_exception(logger, f"转换剧本内容失败: {str(e)}")
            raise HTTPException(status_code=400, detail="剧本内容必须是有效的字符串")
    
    try:
        # 获取用户分镜顺序记录
        logger.debug(f"尝试获取用户 {user_id} 项目 {project_id} 的分镜顺序记录")
        user_shot = get_user_shots_order(db, user_id, project_id)
        
        if user_shot is None:
            logger.error(f"未找到用户 {user_id} 项目 {project_id} 的分镜顺序记录")
            raise HTTPException(status_code=404, detail="未找到项目信息")
        
        # 更新剧本内容
        logger.debug(f"更新项目 {project_id} 的剧本，长度: {len(script)}")
        user_shot.script = script
        
        # 记录更新时间
        user_shot.updated_at = datetime.now(timezone.utc)
        
        # 提交数据库更改
        try:
            logger.debug("提交数据库更改")
            db.commit()
            logger.info(f"成功更新用户 {user_id} 项目 {project_id} 的剧本")
            return user_shot
        except Exception as e:
            db.rollback()
            log_exception(logger, f"数据库提交更改失败: {str(e)}")
            raise HTTPException(status_code=500, detail=f"数据库更新失败: {str(e)}")
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        log_exception(logger, f"更新剧本内容失败: {str(e)}")
        # 提供更详细的错误消息
        if "database" in str(e).lower():
            raise HTTPException(status_code=500, detail=f"数据库操作失败: {str(e)}")
        else:
            raise HTTPException(status_code=500, detail=f"更新剧本内容失败: {str(e)}")

def update_characters(db: Session, characters: dict, user_id: int, project_id: int = None):
    """
    更新用户项目的角色信息
    
    Args:
        db: 数据库会话
        characters: 角色信息字典，键为角色名，值为角色描述
        user_id: 用户ID
        project_id: 项目ID，必须提供
        
    Returns:
        更新后的UserShot对象
    """
    # 如果没有提供project_id，返回400错误
    if project_id is None:
        logger.error(f"用户 {user_id} 尝试更新角色信息但未提供project_id")
        raise HTTPException(status_code=400, detail="必须提供项目ID")
    
    logger.info(f"用户 {user_id} 正在更新项目 {project_id} 的角色信息")
    logger.debug(f"角色数据: {characters}, 类型: {type(characters)}")
    
    try:
        # 获取用户分镜顺序记录
        user_shot = get_user_shots_order(db, user_id, project_id)
        
        # 更新角色信息
        user_shot.characters = characters
        db.commit()
        
        logger.info(f"成功更新用户 {user_id} 项目 {project_id} 的角色信息")
        return user_shot
        
    except Exception as e:
        db.rollback()
        log_exception(logger, f"更新角色信息失败: {str(e)}")
        raise HTTPException(status_code=500, detail="更新角色信息失败")