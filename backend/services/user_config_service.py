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
        文本内容对象，包含所有配置字段
    """
    logger.info("正在获取用户配置")
    try:
        config = models.UserConfig.get_or_create(db)
        logger.info("成功获取用户配置")
        # 确保返回所有字段，包括新的 LLM 字段
        return config 
    except Exception as e:
        log_exception(logger, f"获取用户配置失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取用户配置失败")

def update_user_config(db: Session, content_text: str = None, 
                       global_comfyui_payload: dict = None, 
                       comfyui_url: str = None,
                       openai_url: str = None,  # 新增 OpenAI URL 参数
                       openai_api_key: str = None, # 新增 OpenAI API Key 参数
                       model: str = None # 新增: LLM 模型名称参数
                       ):
    """
    更新用户配置
    
    Args:
        db: 数据库会话
        content_text: 新的文本内容 (可选)
        global_comfyui_payload: ComfyUI全局配置JSON数据 (可选)
        comfyui_url: ComfyUI的URL (可选)
        openai_url: OpenAI URL (可选)
        openai_api_key: OpenAI API Key (可选)
        model: LLM 模型名称 (可选)
        
    Returns:
        更新后的用户配置对象
    """
    logger.info("正在更新用户配置")
    try:
        config = models.UserConfig.get_or_create(db)
        
        # 更新各个字段（如果提供了值）
        if content_text is not None:
            config.content = content_text
            logger.info("已更新 content")
        
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
                
            config.global_comfyui_payload = global_comfyui_payload
            logger.info("已设置 global_comfyui_payload")
        
        if comfyui_url is not None:
            config.comfyui_url = comfyui_url
            logger.info(f"已设置 comfyui_url: {comfyui_url}")
            
        # 新增：更新 OpenAI 相关字段
        if openai_url is not None:
            config.openai_url = openai_url
            logger.info(f"已设置 openai_url") # 不记录URL本身，可能敏感
            
        if openai_api_key is not None:
            config.openai_api_key = openai_api_key
            logger.info(f"已设置 openai_api_key") # 不记录Key本身，极其敏感
            
        # 新增：更新 model 字段
        if model is not None:
            config.model = model
            logger.info(f"已设置 model: {model}")
            
        db.commit()
        logger.info("数据库 commit 成功")
        
        db.refresh(config)
        logger.info("用户配置更新成功")
        return config
    except Exception as e:
        db.rollback()
        log_exception(logger, f"更新用户配置失败: {str(e)}")
        raise HTTPException(status_code=500, detail="更新用户配置失败")

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

    return user_config 