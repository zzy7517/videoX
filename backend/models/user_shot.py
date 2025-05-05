"""用户分镜关联模型"""
from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .base import Base

class UserShot(Base):
    """用户分镜关联模型"""
    __tablename__ = "user_shots"

    # 设置默认值为1，在测试阶段使用，正式上线前需要移除此默认值并实现完整的用户功能
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    project_id = Column(Integer)
    script = Column(JSONB, nullable=False)  # 存储script
    shots_order = Column(JSONB, nullable=False)  # 存储shot_id和order的对应关系
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # 关系
    user = relationship("User", back_populates="user_shots") 