"""文本内容服务
包含所有文本内容相关的业务逻辑和数据库操作
"""
from .. import models
from sqlalchemy.orm import Session
from fastapi import HTTPException
from ..logger import setup_logger, log_exception

# 设置日志
logger = setup_logger("backend.services.text_content_service")

def get_text_content(db: Session):
    """
    获取文本内容
    
    Args:
        db: 数据库会话
        
    Returns:
        文本内容对象
    """
    logger.info("正在获取文本内容")
    try:
        content = models.TextContent.get_or_create(db)
        logger.info("成功获取文本内容")
        return content
    except Exception as e:
        log_exception(logger, f"获取文本内容失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取文本内容失败")

def update_text_content(db: Session, content_text: str):
    """
    更新文本内容
    
    Args:
        db: 数据库会话
        content_text: 新的文本内容
        
    Returns:
        更新后的文本内容对象
    """
    logger.info("正在更新文本内容")
    try:
        content = models.TextContent.get_or_create(db)
        content.content = content_text
        # updated_at 会自动更新 (假设模型中配置了 onupdate)
        db.commit()
        db.refresh(content)
        logger.info("文本内容更新成功")
        return content
    except Exception as e:
        db.rollback()
        log_exception(logger, f"更新文本内容失败: {str(e)}")
        raise HTTPException(status_code=500, detail="更新文本内容失败")

def clear_text_content(db: Session):
    """
    清空文本内容
    
    Args:
        db: 数据库会话
    """
    logger.info("正在清空文本内容")
    try:
        content = models.TextContent.get_or_create(db)
        content.content = ""  # 设置为空字符串而不是 None，避免潜在问题
        # updated_at 会自动更新 (假设模型中配置了 onupdate)
        db.commit()
        logger.info("文本内容已清空")
    except Exception as e:
        db.rollback()
        log_exception(logger, f"清空文本内容失败: {str(e)}")
        raise HTTPException(status_code=500, detail="清空文本内容失败") 