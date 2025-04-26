from fastapi import FastAPI, Depends, HTTPException, APIRouter, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Literal # Literal 用于限制字符串参数
from . import models, database
from pydantic import BaseModel
from datetime import datetime
from .logger import setup_logger, log_exception
from fastapi.middleware.cors import CORSMiddleware
from .middleware import LoggingMiddleware
from .services import shot_service, text_content_service

# 设置日志
logger = setup_logger("backend.api")

# 创建API应用
app = FastAPI(title="VideoX Backend API - Enhanced Order Management")

# 添加CORS中间件 (允许所有来源，生产环境应更严格)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 添加日志中间件
app.add_middleware(LoggingMiddleware)

# --- Pydantic 模型定义 ---

class ShotBase(BaseModel):
    """分镜基础模型，只包含内容"""
    content: str

class ShotCreate(ShotBase):
    """用于创建新分镜的请求模型 (总是添加到末尾)"""
    pass # order 由后端确定

class ShotUpdate(BaseModel):
    """用于更新分镜内容的请求模型"""
    content: str # 只允许更新内容

class ShotResponse(ShotBase):
    """分镜响应模型，包含数据库主键和当前顺序"""
    shot_id: int   # 稳定、唯一的数据库主键 ID
    order: int    # 当前在列表中的顺序，由后端维护

    class Config:
        from_attributes = True # 从 ORM 对象属性自动填充

class InsertShotRequest(BaseModel):
    """在指定位置插入分镜的请求模型"""
    reference_shot_id: int        # 参考分镜的数据库 ID
    position: Literal["above", "below"] # 插入位置 ("above" 或 "below")
    content: str                # 新分镜的内容

class BulkUpdateRequest(BaseModel):
    """批量替换所有分镜的请求模型 (用于文本导入)"""
    shots: List[ShotBase] # 要替换成的新分镜列表，只含内容

# --- 文本内容相关模型 (保持不变) ---
class TextContentBase(BaseModel):
    content: Optional[str] = None

class TextContentResponse(TextContentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- API 路由 ---
main_router = APIRouter(tags=["main"])

# --- 分镜 (Shots) 相关 API ---

@main_router.get("/shots/", response_model=List[ShotResponse])
def get_shots(db: Session = Depends(database.get_db)):
    """
    获取所有分镜。
    总是按照 'order' 字段升序返回。
    """
    try:
        logger.info("尝试获取所有分镜")
        shots = shot_service.get_all_shots(db)
        logger.info(f"成功获取分镜，数量: {len(shots)}")
        return shots
    except Exception as e:
        logger.error(f"获取分镜时发生错误: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取分镜失败: {str(e)}")

@main_router.post("/shots/", response_model=ShotResponse)
def create_shot_at_end(shot_data: ShotCreate, db: Session = Depends(database.get_db)):
    """
    创建新分镜，并将其添加到列表末尾。
    自动计算新分镜的 order。
    """
    return shot_service.create_shot(db, shot_data.content)

@main_router.put("/shots/{shot_id}", response_model=ShotResponse)
def update_shot_content(shot_id: int, shot_update: ShotUpdate, db: Session = Depends(database.get_db)):
    """
    更新指定 ID 分镜的内容。
    不改变其 order。
    """
    return shot_service.update_shot(db, shot_id, shot_update.content)

@main_router.delete("/shots/{shot_id}", response_model=List[ShotResponse])
def delete_shot_and_reorder(shot_id: int, db: Session = Depends(database.get_db)):
    """
    删除指定 ID 的分镜，并自动调整后续分镜的 order。
    返回删除并重新排序后的完整分镜列表。
    """
    return shot_service.delete_shot(db, shot_id)

@main_router.post("/shots/insert/", response_model=List[ShotResponse])
def insert_shot_and_reorder(request: InsertShotRequest, db: Session = Depends(database.get_db)):
    """
    在指定参考分镜 ID 的上方或下方插入新分镜，并自动调整后续分镜的 order。
    返回插入并重新排序后的完整分镜列表。
    """
    return shot_service.insert_shot(db, request.reference_shot_id, request.position, request.content)

@main_router.delete("/shots/", status_code=204) # 204 No Content 通常用于成功删除且无返回体
def delete_all_shots(db: Session = Depends(database.get_db)):
    """
    删除所有分镜。
    """
    shot_service.delete_all_shots(db)
    return # 无需返回任何内容，状态码 204 已表明成功

@main_router.put("/shots/", response_model=List[ShotResponse])
def bulk_replace_shots(request: BulkUpdateRequest, db: Session = Depends(database.get_db)):
    """
    批量替换所有分镜。
    先删除所有现有分镜，然后根据请求列表创建新的分镜，并按顺序分配 order。
    常用于文本导入分割后的场景。
    """
    # 提取内容列表
    shots_content = [shot.content for shot in request.shots]
    return shot_service.bulk_replace_shots(db, shots_content)


# --- 文本内容 (Text Content) 相关 API ---

@main_router.get("/text/", response_model=TextContentResponse)
def get_text_content(db: Session = Depends(database.get_db)):
    """获取文本内容 (单条记录)"""
    return text_content_service.get_text_content(db)

@main_router.put("/text/", response_model=TextContentResponse)
def update_text_content(text: TextContentBase, db: Session = Depends(database.get_db)):
    """更新文本内容 (单条记录)"""
    return text_content_service.update_text_content(db, text.content)

@main_router.delete("/text/", status_code=204)
def clear_text_content(db: Session = Depends(database.get_db)):
    """清空文本内容 (将内容设置为空字符串)"""
    text_content_service.clear_text_content(db)
    return # 返回 204 No Content

# 注册主路由
app.include_router(main_router)

# --- 可以在这里添加应用启动时的逻辑 (如果需要) ---
@app.on_event("startup")
async def startup_event():
    logger.info("应用启动...")
    # 创建默认用户
    from sqlalchemy.orm import Session
    from . import models
    from .database import SessionLocal
    
    db = SessionLocal()
    try:
        # 检查是否已存在ID为1的用户
        user = db.query(models.User).filter(models.User.user_id == 1).first()
        if not user:
            logger.info("创建默认用户 (ID: 1)")
            default_user = models.User(
                user_id=1,
                username="default",
                email="default@example.com",
                password="default_password"  # 生产环境应使用加密密码
            )
            db.add(default_user)
            db.commit()
            logger.info("默认用户创建成功")
        else:
            logger.info("默认用户已存在，无需创建")
    except Exception as e:
        db.rollback()
        logger.error(f"创建默认用户时发生错误: {str(e)}", exc_info=True)
    finally:
        db.close()

# @app.on_event("shutdown")
# async def shutdown_event():
#     logger.info("应用关闭...") 