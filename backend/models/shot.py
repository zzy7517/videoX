"""分镜模型"""
from sqlalchemy import Column, Integer, String, DateTime, JSON
from datetime import datetime, timezone
from .base import Base

class Shot(Base):
    """分镜模型"""
    __tablename__ = "shots"

    shot_id = Column(Integer, primary_key=True, index=True)
    content = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    t2i_prompt = Column(String, nullable=True)
    characters = Column(JSON, nullable=True)  # 存储角色列表，可多选

    class Config:
        orm_mode = True

    @classmethod
    def get_max_order(cls, db):
        """获取当前最大的 order 值"""
        from sqlalchemy import func
        max_order = db.query(func.max(cls.order)).scalar()
        return max_order or 0
    
    @classmethod
    def shift_orders(cls, db, from_order, shift_by=1):
        """
        调整指定 order 之后的所有分镜 order
        从 from_order 开始，将所有 order 值增加或减少 shift_by
        """
        if shift_by > 0:
            # 将 ≥ from_order 的记录 order 值增加
            return db.query(cls).filter(cls.order >= from_order).update(
                {"order": cls.order + shift_by}, synchronize_session=False
            )
        elif shift_by < 0:
            # 将 > from_order 的记录 order 值减少
            return db.query(cls).filter(cls.order > from_order).update(
                {"order": cls.order + shift_by}, synchronize_session=False
            ) 