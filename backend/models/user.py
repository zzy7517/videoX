"""用户模型 - 定义用户在数据库中的结构"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .base import Base

class User(Base):
    """
    用户模型类
    
    这个类定义了用户表的结构，包含了用户的基本信息如用户名、邮箱、密码等。
    同时也定义了用户与其他表（如用户内容、用户分镜）的关系。
    """
    __tablename__ = "users"  # 数据库表名

    # 主键ID，自增长
    user_id = Column(Integer, primary_key=True, index=True)  # primary_key=True 表示这是主键，index=True 表示创建索引提高查询性能
    
    # 用户名，不允许为空
    username = Column(String, nullable=False)
    
    # 电子邮箱，必须唯一，不允许为空，创建索引用于快速查询
    email = Column(String, nullable=False, unique=True, index=True)  # unique=True 确保邮箱唯一性
    
    # 密码，存储的是加密后的哈希值，不是明文
    password = Column(String, nullable=False)
    
    # 创建时间，自动设置为当前UTC时间
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # 更新时间，创建时和更新时都会设置为当前UTC时间
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # 关系定义 - 一对一关系，一个用户对应一个内容配置
    # cascade="all, delete-orphan" 表示删除用户时，相关的用户内容也会被删除
    content = relationship("UserConfig", back_populates="user", uselist=False, cascade="all, delete-orphan")

    # 添加与UserShot的关系
    user_shots = relationship("UserShot", back_populates="user", uselist=False, cascade="all, delete-orphan")

    def update_last_login(self):
        """
        更新用户登录时间
        
        在用户成功登录后调用此方法，更新updated_at时间戳
        """
        self.updated_at = datetime.now(timezone.utc)
        
    def to_dict(self):
        """
        将用户对象转换为字典形式
        
        用于API响应，避免直接返回数据库模型对象
        移除了敏感信息如密码
        """
        return {
            "user_id": self.user_id,
            "username": self.username,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }