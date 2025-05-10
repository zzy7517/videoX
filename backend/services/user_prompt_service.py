"""用户提示词服务"""
from sqlalchemy.orm import Session
from ..models import UserPrompt, User
from ..logger import setup_logger

# 设置日志
logger = setup_logger("backend.services.user_prompt_service")

def get_user_prompt(db: Session, user_id: int):
    """
    获取用户提示词
    
    如果用户没有提示词记录，返回None
    """
    if not user_id:
        logger.warning("尝试获取未登录用户的提示词")
        return None
        
    user_prompt = db.query(UserPrompt).filter(UserPrompt.user_id == user_id).first()
    return user_prompt
    
def update_user_prompt(db: Session, user_id: int, character_prompt: str = None, shot_prompt: str = None):
    """
    更新用户提示词
    
    如果用户没有提示词记录，创建一个新记录
    如果提供了None，则不更新对应字段
    """
    if not user_id:
        logger.warning("尝试更新未登录用户的提示词")
        return None
        
    # 检查用户是否存在
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        logger.error(f"用户 {user_id} 不存在，无法更新提示词")
        return None
        
    # 查找现有记录
    user_prompt = db.query(UserPrompt).filter(UserPrompt.user_id == user_id).first()
    
    # 如果不存在则创建新记录
    if not user_prompt:
        logger.info(f"用户 {user_id} 没有提示词记录，创建新记录")
        user_prompt = UserPrompt(user_id=user_id)
        db.add(user_prompt)
    
    # 更新字段（只更新非None的字段）
    if character_prompt is not None:
        user_prompt.character_prompt = character_prompt
    if shot_prompt is not None:
        user_prompt.shot_prompt = shot_prompt
        
    db.commit()
    db.refresh(user_prompt)
    return user_prompt 