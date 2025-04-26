"""分镜服务
包含所有分镜相关的业务逻辑和数据库操作
"""
from .. import models
from sqlalchemy.orm import Session
from fastapi import HTTPException
from ..logger import setup_logger, log_exception
from . import user_shot_service

# 设置日志
logger = setup_logger("backend.services.shot_service")

def get_all_shots(db: Session):
    """
    获取所有分镜，按order排序
    
    Args:
        db: 数据库会话
        
    Returns:
        按顺序排列的分镜列表
    """
    logger.info("正在获取所有分镜 (按 order 排序)")
    try:
        # 使用用户分镜服务获取已排序的分镜
        shots = user_shot_service.get_ordered_shots(db)
        logger.info(f"成功获取 {len(shots)} 个分镜")
        return shots
    except Exception as e:
        log_exception(logger, f"获取分镜列表失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取分镜列表失败")

def create_shot(db: Session, content: str):
    """
    创建新分镜并添加到列表末尾
    
    Args:
        db: 数据库会话
        content: 分镜内容
        
    Returns:
        创建的分镜对象
    """
    logger.info(f"正在末尾创建新分镜，内容: {content}")
    try:
        # 创建新分镜对象
        db_shot = models.Shot(
            content=content
        )
        db.add(db_shot)
        db.commit()
        db.refresh(db_shot)
        
        # 添加到用户分镜顺序的末尾
        try:
            user_shot_service.add_shot_to_order(db, db_shot.shot_id, position="end")
            
            # 获取更新后的完整对象（包含order）
            updated_shots = user_shot_service.get_ordered_shots(db)
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

def update_shot(db: Session, shot_id: int, content: str):
    """
    更新指定ID分镜的内容
    
    Args:
        db: 数据库会话
        shot_id: 分镜ID
        content: 新的分镜内容
        
    Returns:
        更新后的分镜对象
    """
    logger.info(f"正在更新 ID 为 {shot_id} 的分镜内容")
    try:
        db_shot = db.query(models.Shot).filter(models.Shot.shot_id == shot_id).first()
        if not db_shot:
            logger.warning(f"更新失败：找不到 ID 为 {shot_id} 的分镜")
            raise HTTPException(status_code=404, detail=f"找不到 ID 为 {shot_id} 的分镜")

        db_shot.content = content
        db.commit()
        db.refresh(db_shot)
        
        # 获取更新后的完整对象（包含order）
        updated_shots = user_shot_service.get_ordered_shots(db)
        for shot in updated_shots:
            if shot.shot_id == shot_id:
                logger.info(f"分镜 ID {shot_id} 内容更新成功")
                return shot
        
        logger.info(f"分镜 ID {shot_id} 内容更新成功")
        return db_shot
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        log_exception(logger, f"更新分镜 ID {shot_id} 失败: {str(e)}")
        raise HTTPException(status_code=500, detail="更新分镜失败")

def delete_shot(db: Session, shot_id: int):
    """
    删除指定ID的分镜并重新排序
    
    Args:
        db: 数据库会话
        shot_id: 要删除的分镜ID
        
    Returns:
        重新排序后的分镜列表
    """
    logger.info(f"正在删除 ID 为 {shot_id} 的分镜并重新排序")
    try:
        db.begin()

        # 查找要删除的分镜
        shot_to_delete = db.query(models.Shot).filter(models.Shot.shot_id == shot_id).first()
        if not shot_to_delete:
            db.rollback()
            logger.warning(f"删除失败：找不到 ID 为 {shot_id} 的分镜")
            raise HTTPException(status_code=404, detail=f"找不到 ID 为 {shot_id} 的分镜")
        
        # 从用户排序中移除
        user_shot_service.remove_shot_from_order(db, shot_id)

        # 删除分镜
        db.delete(shot_to_delete)
        logger.info(f"已从数据库删除分镜 ID {shot_id}")

        db.commit()

        # 返回更新后的完整列表
        updated_shots = user_shot_service.get_ordered_shots(db)
        logger.info(f"删除并重新排序完成，返回 {len(updated_shots)} 个分镜")
        return updated_shots
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        log_exception(logger, f"删除分镜 ID {shot_id} 并重新排序失败: {str(e)}")
        raise HTTPException(status_code=500, detail="删除分镜并重新排序失败")

def insert_shot(db: Session, reference_shot_id: int, position: str, content: str):
    """
    在指定位置插入新分镜
    
    Args:
        db: 数据库会话
        reference_shot_id: 参考分镜ID
        position: 插入位置 ("above" 或 "below")
        content: 新分镜内容
        
    Returns:
        插入并重新排序后的分镜列表
    """
    logger.info(f"请求在 ID {reference_shot_id} 的 {position} 插入分镜")
    try:
        db.begin()

        # 查找参考分镜
        reference_shot = db.query(models.Shot).filter(models.Shot.shot_id == reference_shot_id).first()
        if not reference_shot:
            db.rollback()
            logger.warning(f"插入失败：找不到参考分镜 ID {reference_shot_id}")
            raise HTTPException(status_code=404, detail=f"找不到参考分镜 ID {reference_shot_id}")

        # 创建新分镜
        new_shot = models.Shot(
            content=content
        )
        db.add(new_shot)
        db.commit()
        db.refresh(new_shot)
        logger.info(f"已添加新分镜，内容: {content}, ID: {new_shot.shot_id}")
        
        # 添加到用户顺序的指定位置
        user_shot_service.add_shot_to_order(db, new_shot.shot_id, position, reference_shot_id)

        # 返回更新后的完整列表
        updated_shots = user_shot_service.get_ordered_shots(db)
        logger.info(f"插入并重新排序完成，返回 {len(updated_shots)} 个分镜")
        return updated_shots
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        log_exception(logger, f"在 ID {reference_shot_id} 附近插入分镜失败: {str(e)}")
        raise HTTPException(status_code=500, detail="插入分镜失败")

def delete_all_shots(db: Session):
    """
    删除所有分镜
    
    Args:
        db: 数据库会话
        
    Returns:
        删除的记录数
    """
    logger.info("正在请求删除所有分镜")
    try:
        # 删除所有分镜
        deleted_count = db.query(models.Shot).delete()
        
        # 清空用户分镜顺序
        user_shot = db.query(models.UserShot).first()
        if user_shot:
            user_shot.shots_order = {}
            
        db.commit()
        logger.info(f"成功删除 {deleted_count} 个分镜")
        return deleted_count
    except Exception as e:
        db.rollback()
        log_exception(logger, f"删除所有分镜失败: {str(e)}")
        raise HTTPException(status_code=500, detail="删除所有分镜失败")

def bulk_replace_shots(db: Session, shots_content: list):
    """
    批量替换所有分镜
    
    Args:
        db: 数据库会话
        shots_content: 包含分镜内容的列表
        
    Returns:
        新创建的分镜列表
    """
    logger.info(f"请求批量替换所有分镜，新列表包含 {len(shots_content)} 项")
    try:
        db.begin()

        # 1. 删除所有现有分镜
        deleted_count = db.query(models.Shot).delete()
        logger.info(f"批量替换前，删除了 {deleted_count} 个旧分镜")

        # 2. 根据请求列表创建新分镜
        new_shots_orm = []
        for content in shots_content:
            new_shot = models.Shot(
                content=content
            )
            new_shots_orm.append(new_shot)

        if new_shots_orm:
            db.add_all(new_shots_orm)
            logger.info(f"已准备添加 {len(new_shots_orm)} 个新分镜")
        else:
            logger.info("请求的新分镜列表为空，不添加任何新分镜")

        db.commit()
        
        # 刷新以获取ID
        for shot in new_shots_orm:
            db.refresh(shot)
            
        # 3. 重建用户分镜顺序
        user_shot_service.rebuild_shots_order(db, new_shots_orm)

        # 返回新创建的完整列表
        final_shots = user_shot_service.get_ordered_shots(db)
        logger.info(f"批量替换完成，返回 {len(final_shots)} 个分镜")
        return final_shots
    except Exception as e:
        db.rollback()
        log_exception(logger, f"批量替换分镜失败: {str(e)}")
        raise HTTPException(status_code=500, detail="批量替换分镜失败") 