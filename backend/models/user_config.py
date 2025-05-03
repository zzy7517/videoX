"""文本内容模型 (旧模型，保留兼容性)"""
from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .base import Base

class UserConfig(Base):
    """文本内容模型 (旧模型，保留兼容性)"""
    __tablename__ = "user_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=True, index=True)
    content = Column(String, nullable=True)  # 允许为空
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    global_comfyui_payload = Column(JSON, nullable=True)  # 存储ComfyUI自定义工作流
    comfyui_url = Column(String, nullable=True)  # 存储ComfyUI URL
    openai_url = Column(String, nullable=True)  # 存储OpenAI URL
    openai_api_key = Column(String, nullable=True)  # 存储OpenAI API Key
    model = Column(String, nullable=True)  # 新增：存储 LLM 模型名称

    # 关系定义
    user = relationship("User", back_populates="content")

    class Config:
        orm_mode = True
        
    @classmethod
    def get_or_create(cls, db, user_id=None):
        """获取指定用户的配置，如果不存在则创建
        
        Args:
            db: 数据库会话
            user_id: 用户ID，为None时获取无用户关联的记录
        """
        query = db.query(cls)
        if user_id:
            # 查询指定用户的配置
            content = query.filter(cls.user_id == user_id).first()
        else:
            # 查询无用户关联的配置（向后兼容）
            content = query.filter(cls.user_id == None).first()
        
        if not content:
            content = cls(content="", comfyui_url=None, user_id=user_id)
            db.add(content)
            db.commit()
            db.refresh(content)
        return content