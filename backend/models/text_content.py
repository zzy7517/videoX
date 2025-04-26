"""文本内容模型 (旧模型，保留兼容性)"""
from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime, timezone
from .base import Base

class TextContent(Base):
    """文本内容模型 (旧模型，保留兼容性)"""
    __tablename__ = "text_contents"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(String, nullable=True)  # 允许为空
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    class Config:
        orm_mode = True
        
    @classmethod
    def get_or_create(cls, db):
        """获取第一条文本内容记录，如果不存在则创建"""
        content = db.query(cls).first()
        if not content:
            content = cls(content="")  # 初始化为空字符串
            db.add(content)
            db.commit()
            db.refresh(content)
        return content 