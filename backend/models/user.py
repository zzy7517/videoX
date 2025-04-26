"""用户模型"""
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .base import Base

class User(Base):
    """用户模型"""
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True, index=True)
    password = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # 关系
    content = relationship("UserContent", back_populates="user", uselist=False, cascade="all, delete-orphan")
    user_shots = relationship("UserShot", back_populates="user", uselist=False, cascade="all, delete-orphan") 