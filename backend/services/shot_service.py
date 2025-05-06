"""分镜服务
包含所有分镜相关的业务逻辑和数据库操作
"""
from .. import models
from sqlalchemy.orm import Session
from fastapi import HTTPException
from ..logger import setup_logger, log_exception
from . import user_shot_service
from typing import Optional, Dict, List

# 设置日志
logger = setup_logger("backend.services.shot_service")

def get_all_shots(db: Session, user_id: int = None, project_id: int = None):
    """
    获取指定用户的所有分镜，按order排序
    
    Args:
        db: 数据库会话
        user_id: 用户ID，如果为None则使用默认用户
        project_id: 项目ID，如果为None则使用默认项目ID 1
        
    Returns:
        按顺序排列的分镜列表 (包含 t2i_prompt)
    """
    # 确保用户ID和项目ID不为空
    if user_id is None:
        user_id = 1  # 使用默认用户ID
    
    if project_id is None:
        project_id = 1  # 使用默认项目ID
    
    logger.info(f"正在获取用户 {user_id} 项目 {project_id} 的所有分镜 (按 order 排序)")
    try:
        # 使用用户分镜服务获取已排序的分镜
        shots = user_shot_service.get_ordered_shots(db, user_id, project_id)
        logger.info(f"成功获取 {len(shots)} 个分镜")
        return shots
    except Exception as e:
        log_exception(logger, f"获取分镜列表失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取分镜列表失败")

def create_shot(db: Session, content: str, t2i_prompt: Optional[str] = None, user_id: int = None, project_id: int = None):
    """
    创建新分镜
    
    Args:
        db: 数据库会话
        content: 分镜内容
        t2i_prompt: 提示词 (可选)
        user_id: 用户ID，如果为None则使用默认用户ID 1
        project_id: 项目ID，如果为None则使用默认项目ID 1
        
    Returns:
        创建的分镜对象
    """
    # 确保用户ID和项目ID不为空
    if user_id is None:
        user_id = 1  # 使用默认用户ID
    
    if project_id is None:
        project_id = 1  # 使用默认项目ID
    
    logger.info(f"用户 {user_id} 项目 {project_id} 正在末尾创建新分镜，内容: {content}, 提示词: {t2i_prompt}")
    
    try:
        # 创建新分镜
        db_shot = models.Shot(
            content=content,
            t2i_prompt=t2i_prompt
        )
        db.add(db_shot)
        db.commit()
        db.refresh(db_shot)
        logger.info(f"已添加新分镜，内容: {content}, ID: {db_shot.shot_id}")
        
        # 添加到用户分镜顺序的末尾
        try:
            user_shot_service.add_shot_to_order(db, db_shot.shot_id, position="end", user_id=user_id, project_id=project_id)
            
            # 获取更新后的完整对象（包含order）
            updated_shots = user_shot_service.get_ordered_shots(db, user_id, project_id)
            for shot in updated_shots:
                if shot.shot_id == db_shot.shot_id:
                    logger.info(f"分镜创建成功，ID: {db_shot.shot_id}, Order: {shot.order}")
                    # 手动添加order属性
                    db_shot.order = shot.order
                    return shot
        except Exception as e:
            log_exception(logger, f"获取新分镜的顺序信息失败: {str(e)}")
            # 如果获取顺序失败，仍返回基本对象，但手动设置一个默认顺序
            db_shot.order = 1
            logger.info(f"分镜创建成功，但无法获取顺序，使用默认顺序 1，ID: {db_shot.shot_id}")
            return db_shot
        
        # 如果没有找到对应顺序，也返回基本对象
        db_shot.order = 1
        logger.info(f"分镜创建成功，ID: {db_shot.shot_id}，使用默认顺序 1")
        return db_shot
    except Exception as e:
        db.rollback()
        log_exception(logger, f"创建分镜失败: {str(e)}")
        raise HTTPException(status_code=500, detail="创建分镜失败")

def update_shot(db: Session, shot_id: int, content: Optional[str] = None, t2i_prompt: Optional[str] = None, user_id: int = None, project_id: int = None, characters: Optional[Dict[str, str]] = None):
    """
    更新指定ID分镜的内容和/或提示词
    
    Args:
        db: 数据库会话
        shot_id: 分镜ID
        content: 新的分镜内容 (可选)
        t2i_prompt: 新的提示词 (可选)
        user_id: 用户ID，用于获取更新后的分镜
        project_id: 项目ID
        characters: 角色信息字典 (可选)
        
    Returns:
        更新后的分镜对象
    """
    # 确保用户ID和项目ID不为空
    if user_id is None:
        logger.error("更新分镜失败：未提供用户ID")
        raise HTTPException(status_code=400, detail="更新分镜失败：必须提供用户ID")
    
    if project_id is None:
        logger.error("更新分镜失败：未提供项目ID")
        raise HTTPException(status_code=400, detail="更新分镜失败：必须提供项目ID")
    
    logger.info(f"用户 {user_id} 项目 {project_id} 正在更新 ID 为 {shot_id} 的分镜")
    try:
        db_shot = db.query(models.Shot).filter(models.Shot.shot_id == shot_id).first()
        if not db_shot:
            logger.warning(f"更新失败：找不到 ID 为 {shot_id} 的分镜")
            raise HTTPException(status_code=404, detail=f"找不到 ID 为 {shot_id} 的分镜")

        updated = False
        if content is not None:
            db_shot.content = content
            updated = True
            logger.info(f"分镜 ID {shot_id} 内容已更新")
        if t2i_prompt is not None:
            db_shot.t2i_prompt = t2i_prompt
            updated = True
            logger.info(f"分镜 ID {shot_id} 提示词已更新")
        if characters is not None:
            db_shot.characters = characters
            updated = True
            logger.info(f"分镜 ID {shot_id} 角色信息已更新")
        if updated:
            db.commit()
            db.refresh(db_shot)
        else:
             logger.info(f"分镜 ID {shot_id} 无需更新")
        
        # 获取更新后的完整对象（包含order）
        updated_shots = user_shot_service.get_ordered_shots(db, user_id, project_id)
        for shot in updated_shots:
            if shot.shot_id == shot_id:
                logger.info(f"分镜 ID {shot_id} 更新处理完成")
                return shot
        
        # 如果上面循环没找到 (理论上不应该)，返回查询到的对象
        logger.warning(f"更新分镜 ID {shot_id} 后在有序列表中未找到，返回原始查询对象")
        return db_shot
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        log_exception(logger, f"更新分镜 ID {shot_id} 失败: {str(e)}")
        raise HTTPException(status_code=500, detail="更新分镜失败")

def delete_shot(db: Session, shot_id: int, user_id: int, project_id: int = None):
    """
    删除指定ID的分镜并重新排序
    
    Args:
        db: 数据库会话
        shot_id: 要删除的分镜ID
        user_id: 用户ID，指定哪个用户的分镜顺序需要更新
        project_id: 项目ID，如果为None则使用默认项目ID 1
        
    Returns:
        重新排序后的分镜列表
    """
    # 确保用户ID和项目ID不为空
    if user_id is None:
        user_id = 1  # 使用默认用户ID
    
    if project_id is None:
        project_id = 1  # 使用默认项目ID
    
    logger.info(f"正在删除用户 {user_id} 项目 {project_id} 的 ID 为 {shot_id} 的分镜并重新排序")
    try:
        # 查找要删除的分镜
        shot_to_delete = db.query(models.Shot).filter(models.Shot.shot_id == shot_id).first()
        if not shot_to_delete:
            logger.warning(f"删除失败：找不到 ID 为 {shot_id} 的分镜")
            raise HTTPException(status_code=404, detail=f"找不到 ID 为 {shot_id} 的分镜")
        
        # 从用户排序中移除
        user_shot_service.remove_shot_from_order(db, shot_id, user_id=user_id, project_id=project_id)

        # 删除分镜
        db.delete(shot_to_delete)
        logger.info(f"已从数据库删除分镜 ID {shot_id}")

        db.commit()

        # 返回更新后的完整列表
        updated_shots = user_shot_service.get_ordered_shots(db, user_id, project_id)
        logger.info(f"删除并重新排序完成，返回 {len(updated_shots)} 个分镜")
        return updated_shots
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        log_exception(logger, f"删除分镜 ID {shot_id} 失败: {str(e)}")
        raise HTTPException(status_code=500, detail="删除分镜失败")

def insert_shot(db: Session, reference_shot_id: int, position: str, content: str, t2i_prompt: Optional[str] = None, user_id: int = None, project_id: int = None):
    """
    在指定位置插入新分镜
    
    Args:
        db: 数据库会话
        reference_shot_id: 参考分镜ID，插入位置的相对参考点
        position: 插入位置 ('above' 或 'below')
        content: 新分镜内容
        t2i_prompt: 提示词 (可选)
        user_id: 用户ID，指定为哪个用户创建分镜
        project_id: 项目ID，如果为None则使用默认项目ID 1
        
    Returns:
        更新后的分镜列表
    """
    # 确保用户ID和项目ID不为空
    if user_id is None:
        user_id = 1  # 使用默认用户ID
    
    if project_id is None:
        project_id = 1  # 使用默认项目ID
    
    logger.info(f"用户 {user_id} 项目 {project_id} 请求在 ID {reference_shot_id} 的 {position} 插入分镜，内容: {content}, 提示词: {t2i_prompt}")
    
    try:
        # 查找参考分镜
        reference_shot = db.query(models.Shot).filter(models.Shot.shot_id == reference_shot_id).first()
        if not reference_shot:
            logger.warning(f"插入失败：找不到参考分镜 ID {reference_shot_id}")
            raise HTTPException(status_code=404, detail=f"找不到参考分镜 ID {reference_shot_id}")

        # 创建新分镜
        new_shot = models.Shot(
            content=content,
            t2i_prompt=t2i_prompt
        )
        db.add(new_shot)
        db.commit()
        db.refresh(new_shot)
        logger.info(f"已添加新分镜，内容: {content}, ID: {new_shot.shot_id}")
        
        # 添加到用户顺序的指定位置
        user_shot_service.add_shot_to_order(db, new_shot.shot_id, position, reference_shot_id, user_id=user_id, project_id=project_id)

        # 返回更新后的完整列表
        updated_shots = user_shot_service.get_ordered_shots(db, user_id, project_id)
        logger.info(f"插入并重新排序完成，返回 {len(updated_shots)} 个分镜")
        return updated_shots
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        log_exception(logger, f"在 ID {reference_shot_id} 附近插入分镜失败: {str(e)}")
        raise HTTPException(status_code=500, detail="插入分镜失败")

def delete_all_shots(db: Session, user_id: int, project_id: int = None):
    """
    删除所有分镜
    
    Args:
        db: 数据库会话
        user_id: 用户ID，指定哪个用户的分镜顺序需要清空
        project_id: 项目ID，如果为None则使用默认项目ID 1
        
    Returns:
        删除的记录数
    """
    # 确保用户ID和项目ID不为空
    if user_id is None:
        user_id = 1  # 使用默认用户ID
    
    if project_id is None:
        project_id = 1  # 使用默认项目ID
    
    logger.info(f"正在请求删除用户 {user_id} 项目 {project_id} 的所有分镜")
    try:
        # 查询用户的分镜顺序
        query = db.query(models.UserShot).filter(
            models.UserShot.user_id == user_id,
            models.UserShot.project_id == project_id
        )
        user_shot = query.first()
        
        # 如果存在用户分镜顺序记录，则清空
        if user_shot:
            # 保存要删除的分镜ID列表
            shot_ids_to_delete = list(map(int, user_shot.shots_order.keys()))
            
            # 清空用户分镜顺序
            user_shot.shots_order = {}
            
            # 删除用户的所有分镜
            deleted_count = 0
            if shot_ids_to_delete:
                deleted_count = db.query(models.Shot).filter(models.Shot.shot_id.in_(shot_ids_to_delete)).delete(synchronize_session=False)
                # 删除用户分镜关系记录
                db.delete(user_shot)
            db.commit()
            logger.info(f"成功删除用户 {user_id} 项目 {project_id} 的 {deleted_count} 个分镜")
            return deleted_count
        else:
            logger.info(f"用户 {user_id} 项目 {project_id} 没有分镜顺序记录，无需删除")
            return 0
    except Exception as e:
        db.rollback()
        log_exception(logger, f"删除用户 {user_id} 项目 {project_id} 的所有分镜失败: {str(e)}")
        raise HTTPException(status_code=500, detail="删除所有分镜失败")

def bulk_replace_shots(db: Session, shots_data: list, user_id: int, project_id: int = None, script: Optional[str] = None, characters: Optional[Dict[str, str]] = None):
    """
    批量替换所有分镜
    
    Args:
        db: 数据库会话
        shots_data: 包含分镜对象的列表 (例如来自 Pydantic 的 ShotBase)
        user_id: 用户ID，指定哪个用户的分镜需要替换
        project_id: 项目ID，如果为None则使用默认项目ID 1
        script: 要保留的剧本内容（可选）
        characters: 要保留的角色信息（可选）
        
    Returns:
        新创建的分镜列表
    """
    # 确保用户ID和项目ID不为空
    if user_id is None:
        user_id = 1  # 使用默认用户ID
    
    if project_id is None:
        project_id = 1  # 使用默认项目ID
    
    logger.info(f"用户 {user_id} 项目 {project_id} 正在批量替换所有分镜，共 {len(shots_data)} 条")
    try:
        # 如果需要保留剧本和角色信息，先获取当前用户的分镜记录
        user_shot_record = None
        if script is not None or characters is not None:
            user_shot_record = user_shot_service.get_user_shots_order(db, user_id, project_id)
        
        # 1. 删除所有现有分镜和排序
        delete_all_shots(db, user_id, project_id) # 复用删除所有分镜的逻辑
        logger.info("旧分镜和排序已清除")
        
        # 重新获取或创建用户分镜记录
        user_shot = user_shot_service.get_user_shots_order(db, user_id, project_id)
        
        # 2. 保存原有的剧本和角色信息
        if script is not None:
            user_shot.script = script
            logger.info(f"保留原有剧本，长度: {len(script)}")
        
        if characters is not None:
            user_shot.characters = characters
            logger.info(f"保留原有角色信息，共 {len(characters)} 个角色")

        # 3. 创建新分镜
        new_shots_db = []
        shot_order_mapping = {}
        order_counter = 1
        for shot_input in shots_data:
            new_shot = models.Shot(
                content=shot_input.content,
                t2i_prompt=getattr(shot_input, 't2i_prompt', None) # 安全地获取 t2i_prompt
            )
            db.add(new_shot)
            db.flush() # 刷新以获取 new_shot.shot_id
            new_shots_db.append(new_shot)
            shot_order_mapping[str(new_shot.shot_id)] = order_counter
            order_counter += 1
        
        # 4. 更新用户分镜排序
        user_shot_service.set_shot_order(db, shot_order_mapping, user_id, project_id)

        db.commit() # 提交所有更改
        
        # 重新获取完整、排序后的列表返回给前端
        final_shots = user_shot_service.get_ordered_shots(db, user_id, project_id)
        logger.info(f"批量替换完成，创建了 {len(final_shots)} 个新分镜")
        return final_shots
    except Exception as e:
        db.rollback()
        log_exception(logger, f"批量替换分镜失败: {str(e)}")
        raise HTTPException(status_code=500, detail="批量替换分镜失败") 