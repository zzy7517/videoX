"""文本内容服务
包含所有文本内容相关的业务逻辑和数据库操作
"""
from .. import models
from sqlalchemy.orm import Session
from fastapi import HTTPException
from ..logger import setup_logger, log_exception
import json

# 设置日志
logger = setup_logger("backend.services.text_content_service")

def get_user_config(db: Session):
    """
    获取文本内容
    
    Args:
        db: 数据库会话
        
    Returns:
        文本内容对象
    """
    logger.info("正在获取文本内容")
    try:
        content = models.UserConfig.get_or_create(db)
        logger.info("成功获取文本内容")
        return content
    except Exception as e:
        log_exception(logger, f"获取文本内容失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取文本内容失败")

def update_user_config(db: Session, content_text: str, global_comfyui_payload=None, comfyui_url=None):
    """
    更新文本内容
    
    Args:
        db: 数据库会话
        content_text: 新的文本内容
        global_comfyui_payload: ComfyUI全局配置JSON数据
        comfyui_url: ComfyUI的URL
        
    Returns:
        更新后的文本内容对象
    """
    logger.info("正在更新文本内容")
    try:
        content = models.UserConfig.get_or_create(db)
        content.content = content_text
        
        logger.debug(f"global_comfyui_payload类型: {type(global_comfyui_payload)}")
        logger.debug(f"global_comfyui_payload值: {global_comfyui_payload}")
        
        if global_comfyui_payload is not None:
            # 确保是有效的JSON格式数据
            if isinstance(global_comfyui_payload, str):
                try:
                    # 如果是字符串，尝试解析为Python对象
                    global_comfyui_payload = json.loads(global_comfyui_payload)
                    logger.info("已将字符串转换为Python对象")
                except json.JSONDecodeError as e:
                    logger.error(f"无效的JSON字符串: {e}")
                    raise HTTPException(status_code=400, detail=f"无效的JSON格式: {str(e)}")
            
            # 确保是字典类型
            if not isinstance(global_comfyui_payload, dict):
                logger.error(f"global_comfyui_payload必须是字典类型，当前类型: {type(global_comfyui_payload)}")
                raise HTTPException(status_code=400, detail="payload必须是有效的JSON对象(字典)")
                
            content.global_comfyui_payload = global_comfyui_payload
            logger.info("已设置global_comfyui_payload")
        
        # 处理comfyui_url字段
        if comfyui_url is not None:
            content.comfyui_url = comfyui_url
            logger.info(f"已设置comfyui_url: {comfyui_url}")
            
        db.commit()
        logger.info("数据库commit成功")
        
        db.refresh(content)
        logger.debug(f"刷新后的global_comfyui_payload: {content.global_comfyui_payload}")
        logger.info("文本内容更新成功")
        return content
    except Exception as e:
        db.rollback()
        log_exception(logger, f"更新文本内容失败: {str(e)}")
        raise HTTPException(status_code=500, detail="更新文本内容失败")

def clear_text_content(db: Session):
    """
    只清空文本内容
    
    Args:
        db: 数据库会话
    """
    logger.info("正在清空文本内容")
    try:
        content = models.UserConfig.get_or_create(db)
        content.content = ""  # 设置为空字符串而不是 None，避免潜在问题
        # updated_at 会自动更新 (假设模型中配置了 onupdate)
        db.commit()
        logger.info("文本内容已清空")
    except Exception as e:
        db.rollback()
        log_exception(logger, f"清空文本内容失败: {str(e)}")
        raise HTTPException(status_code=500, detail="清空文本内容失败") 