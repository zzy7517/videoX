from fastapi import FastAPI, Depends, HTTPException, APIRouter, Body, Request
from sqlalchemy.orm import Session
from typing import List, Optional, Literal # Literal 用于限制字符串参数
from . import models, database
from pydantic import BaseModel
from datetime import datetime
from .logger import setup_logger, log_exception
from fastapi.middleware.cors import CORSMiddleware
from .middleware import LoggingMiddleware, get_current_user_from_request
from .services import shot_service, user_config_service, user_shot_service
from .api_auth import auth_router  # 导入认证路由器
from .middleware.auth import AuthMiddleware  # 导入认证中间件

# 设置日志
logger = setup_logger("backend.api")

# 创建API应用
app = FastAPI(title="VideoX Backend API - Enhanced Order Management")

# 添加CORS中间件 (允许前端开发服务器访问)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 允许前端开发服务器
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 添加认证中间件（必须在CORS中间件之后）
app.add_middleware(AuthMiddleware)

# 添加日志中间件
app.add_middleware(LoggingMiddleware)

# --- Pydantic 模型定义 ---

class ShotBase(BaseModel):
    """分镜基础模型，只包含内容"""
    content: str
    t2i_prompt: Optional[str] = None # 新增：可选的 t2i_prompt

class ShotCreate(ShotBase):
    """用于创建新分镜的请求模型 (总是添加到末尾)"""
    pass # order 由后端确定

class ShotUpdate(BaseModel):
    """用于更新分镜内容的请求模型"""
    content: Optional[str] = None # 改为可选
    t2i_prompt: Optional[str] = None # 新增：可选的 t2i_prompt

class ShotResponse(ShotBase):
    """分镜响应模型，包含数据库主键和当前顺序"""
    shot_id: int   # 稳定、唯一的数据库主键 ID
    order: int    # 当前在列表中的顺序，由后端维护
    # t2i_prompt 继承自 ShotBase

    class Config:
        from_attributes = True # 从 ORM 对象属性自动填充

class InsertShotRequest(BaseModel):
    """在指定位置插入分镜的请求模型"""
    reference_shot_id: int        # 参考分镜的数据库 ID
    position: Literal["above", "below"] # 插入位置 ("above" 或 "below")
    content: str                # 新分镜的内容
    t2i_prompt: Optional[str] = None # 新增：可选的 t2i_prompt

class BulkUpdateRequest(BaseModel):
    """批量替换所有分镜的请求模型 (用于文本导入)"""
    shots: List[ShotBase] # 要替换成的新分镜列表，现在包含 t2i_prompt

# --- 文本内容相关模型 (保持不变) ---
class TextContentBase(BaseModel):
    content: Optional[str] = None
    global_comfyui_payload: Optional[dict] = None
    comfyui_url: Optional[str] = None
    openai_url: Optional[str] = None  # 新增 OpenAI URL
    openai_api_key: Optional[str] = None # 新增 OpenAI API Key
    model: Optional[str] = None # 新增: LLM 模型名称

class ConfigResponse(TextContentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- API 路由 ---
main_router = APIRouter(tags=["main"])

# --- 分镜 (Shots) 相关 API ---

@main_router.get("/shots/", response_model=List[ShotResponse])
async def get_shots(request: Request, db: Session = Depends(database.get_db)):
    """
    获取所有分镜。
    总是按照 'order' 字段升序返回。
    """
    try:
        logger.info("尝试获取所有分镜")
        # 获取当前用户
        user = await get_current_user_from_request(request, db)
        user_id = user.user_id if user else None
        
        logger.info(f"用户 {user_id if user_id else '未登录'} 请求获取分镜")
        # 传递用户ID到shot_service
        shots = shot_service.get_all_shots(db, user_id)
        logger.info(f"成功获取分镜，数量: {len(shots)}")
        return shots
    except Exception as e:
        logger.error(f"获取分镜时发生错误: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取分镜失败: {str(e)}")

@main_router.post("/shots/", response_model=ShotResponse)
async def create_shot_at_end(shot_data: ShotCreate, request: Request, db: Session = Depends(database.get_db)):
    """
    创建新分镜，并将其添加到列表末尾。
    自动计算新分镜的 order。
    """
    # 获取当前用户
    user = await get_current_user_from_request(request, db)
    user_id = user.user_id if user else None
    
    logger.info(f"用户 {user_id if user_id else '未登录'} 创建新分镜")
    return shot_service.create_shot(db, shot_data.content, shot_data.t2i_prompt, user_id)

@main_router.put("/shots/{shot_id}", response_model=ShotResponse)
async def update_shot_content(shot_id: int, shot_update: ShotUpdate, request: Request, db: Session = Depends(database.get_db)):
    """
    更新指定 ID 分镜的内容和/或提示词。
    不改变其 order。
    """
    # 获取当前用户
    user = await get_current_user_from_request(request, db)
    user_id = user.user_id if user else None
    
    logger.info(f"用户 {user_id if user_id else '未登录'} 更新分镜 {shot_id}")
    return shot_service.update_shot(db, shot_id, shot_update.content, shot_update.t2i_prompt, user_id)

@main_router.delete("/shots/{shot_id}", response_model=List[ShotResponse])
async def delete_shot_and_reorder(shot_id: int, request: Request, db: Session = Depends(database.get_db)):
    """
    删除指定 ID 的分镜，并自动调整后续分镜的 order。
    返回删除并重新排序后的完整分镜列表。
    """
    # 获取当前用户
    user = await get_current_user_from_request(request, db)
    user_id = user.user_id if user else None
    
    logger.info(f"用户 {user_id if user_id else '未登录'} 删除分镜 {shot_id}")
    return shot_service.delete_shot(db, shot_id, user_id)

@main_router.post("/shots/insert", response_model=List[ShotResponse])
async def insert_shot_and_reorder(request_data: InsertShotRequest, request: Request, db: Session = Depends(database.get_db)):
    """
    在指定参考分镜 ID 的上方或下方插入新分镜，并自动调整后续分镜的 order。
    返回插入并重新排序后的完整分镜列表。
    """
    # 获取当前用户
    user = await get_current_user_from_request(request, db)
    user_id = user.user_id if user else None
    
    logger.info(f"用户 {user_id if user_id else '未登录'} 插入分镜到 {request_data.reference_shot_id} {request_data.position}")
    return shot_service.insert_shot(db, request_data.reference_shot_id, request_data.position, request_data.content, request_data.t2i_prompt, user_id)

@main_router.delete("/shots/", status_code=204) # 204 No Content 通常用于成功删除且无返回体
async def delete_all_shots(request: Request, db: Session = Depends(database.get_db)):
    """
    删除所有分镜。
    """
    # 获取当前用户
    user = await get_current_user_from_request(request, db)
    user_id = user.user_id if user else None
    
    logger.info(f"用户 {user_id if user_id else '未登录'} 删除所有分镜")
    shot_service.delete_all_shots(db, user_id)
    return # 无需返回任何内容，状态码 204 已表明成功

@main_router.put("/shots/", response_model=List[ShotResponse])
async def bulk_replace_shots(request_data: BulkUpdateRequest, request: Request, db: Session = Depends(database.get_db)):
    """
    批量替换所有分镜。
    先删除所有现有分镜，然后根据请求列表创建新的分镜，并按顺序分配 order。
    常用于文本导入分割后的场景。
    """
    # 获取当前用户
    user = await get_current_user_from_request(request, db)
    user_id = user.user_id if user else None
    
    logger.info(f"用户 {user_id if user_id else '未登录'} 批量替换 {len(request_data.shots)} 个分镜")
    return shot_service.bulk_replace_shots(db, request_data.shots, user_id)


# --- 配置 (User Config) 相关 API ---

@main_router.get("/text/", response_model=ConfigResponse)
async def get_user_config(request: Request, db: Session = Depends(database.get_db)):
    """获取文本内容 (单条记录)"""
    # 获取当前用户
    user = await get_current_user_from_request(request, db)
    user_id = user.user_id if user else None
    
    logger.info(f"用户 {user_id if user_id else '未登录'} 获取文本配置")
    return user_config_service.get_user_config(db, user_id)

@main_router.put("/text/", response_model=ConfigResponse)
async def update_user_config(text: TextContentBase, request: Request, db: Session = Depends(database.get_db)):
    """更新文本内容 (单条记录)"""
    # 获取当前用户
    user = await get_current_user_from_request(request, db)
    user_id = user.user_id if user else None
    
    logger.info(f"用户 {user_id if user_id else '未登录'} 更新文本配置")
    return user_config_service.update_user_config(
        db,
        text.content,
        text.global_comfyui_payload,
        text.comfyui_url,
        text.openai_url,  # 传递 OpenAI URL
        text.openai_api_key, # 传递 OpenAI API Key
        text.model, # 传递 LLM 模型名称
        user_id # 传递用户ID
    )

# 注册主路由
app.include_router(main_router)

# 注册认证路由
app.include_router(auth_router)

# --- 可以在这里添加应用启动时的逻辑 (如果需要) ---
@app.on_event("startup")
async def startup_event():
    logger.info("应用启动...")
    # 由于已经添加了完整的用户注册功能，这里不再需要创建默认用户 