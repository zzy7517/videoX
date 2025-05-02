"""文本内容模型 (旧模型，保留兼容性)"""
from sqlalchemy import Column, Integer, String, DateTime, JSON
from datetime import datetime, timezone
from .base import Base

class UserConfig(Base):
    """文本内容模型 (旧模型，保留兼容性)"""
    __tablename__ = "user_configs"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(String, nullable=True)  # 允许为空
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    global_comfyui_payload = Column(JSON, nullable=True)  # 存储ComfyUI自定义工作流
    comfyui_url = Column(String, nullable=True)  # 存储ComfyUI URL
    openai_url = Column(String, nullable=True)  # 存储OpenAI URL
    openai_api_key = Column(String, nullable=True)  # 存储OpenAI API Key
    model = Column(String, nullable=True)  # 新增：存储 LLM 模型名称

    class Config:
        orm_mode = True
        
    @classmethod
    def get_or_create(cls, db):
        """获取第一条文本内容记录，如果不存在则创建"""
        content = db.query(cls).first()
        if not content:
            content = cls(content="", comfyui_url=None)  # 初始化为空字符串和None
            db.add(content)
            db.commit()
            db.refresh(content)
        return content