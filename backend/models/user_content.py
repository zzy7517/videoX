"""用户内容模型"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .base import Base

class UserContent(Base):
    """用户内容模型"""
    __tablename__ = "user_contents"

    content_id = Column(Integer, primary_key=True, index=True)
    # 设置默认值为1，在测试阶段使用，正式上线前需要移除此默认值并实现完整的用户功能
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, unique=True, default=1)
    content = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # 关系
    user = relationship("User", back_populates="content") 