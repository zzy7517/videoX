"""模型导入"""
from .base import Base
from .user import User
from .shot import Shot
from .user_shot import UserShot
from .user_config import UserConfig

# 导出所有模型，使其可以通过from backend.models import X直接导入
__all__ = [
    'Base', 
    'User', 
    'Shot',
    'UserShot', 
    'UserConfig'
] 