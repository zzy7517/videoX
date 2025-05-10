from sqlalchemy import Column, Integer, VARCHAR, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .base import Base


class UserPrompt(Base):
    """用户提示词模型"""

    __tablename__ = "user_prompts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    character_prompt = Column(VARCHAR, nullable=True)
    shot_prompt = Column(VARCHAR, nullable=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    created_at = Column(TIMESTAMP, server_default=func.now())

    def __repr__(self):
        return f"<UserPrompt(id={self.id}, user_id={self.user_id})>" 