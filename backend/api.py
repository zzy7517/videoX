from fastapi import FastAPI, Depends, HTTPException, APIRouter, Body, Request, Query
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

# --- 项目相关模型 ---
class ProjectResponse(BaseModel):
    """项目响应模型"""
    project_id: int
    name: str

    class Config:
        from_attributes = True

# --- LLM 配置 ---
class LLMConfig(BaseModel):
    silicon_flow_api_key: Optional[str] = None
    silicon_flow_models: Optional[str] = None
    groq_api_key: Optional[str] = None
    groq_models: Optional[str] = None
    # 新增 OpenAI 相关字段
    openai_url: Optional[str] = None  # OpenAI URL
    openai_api_key: Optional[str] = None # OpenAI API Key
    model: Optional[str] = None # LLM 模型名称

# --- 文本内容相关模型 ---
class TextContentBase(BaseModel):
    content: Optional[str] = None
    global_comfyui_payload: Optional[dict] = None
    comfyui_url: Optional[str] = None
    # 移除单独的 LLM 设置字段，全部迁移到 llm_config 内
    llm_config: Optional[LLMConfig] = None # LLM配置

class ConfigResponse(TextContentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        
    @classmethod
    def model_validate(cls, obj, **kwargs):
        """
        从ORM对象创建Pydantic模型，兼容旧版和新版Pydantic
        """
        if hasattr(obj, "__dict__"):  # 对象是ORM模型
            data = {}
            # 基本字段
            for field_name in ["id", "content", "created_at", "updated_at", 
                          "global_comfyui_payload", "comfyui_url"]:
                if hasattr(obj, field_name):
                    data[field_name] = getattr(obj, field_name)

            # 处理 llm_config 字段，将JSON转换为Pydantic模型
            if hasattr(obj, "llm_config") and obj.llm_config:
                llm_config_data = obj.llm_config.copy() if isinstance(obj.llm_config, dict) else obj.llm_config
                
                # 如果对象中存在单独的 openai_url, openai_api_key, model 字段，将其合并到 llm_config 中
                # 这是为了兼容旧版数据模型
                if hasattr(obj, "openai_url") and obj.openai_url:
                    if isinstance(llm_config_data, dict):
                        llm_config_data["openai_url"] = obj.openai_url
                
                if hasattr(obj, "openai_api_key") and obj.openai_api_key:
                    if isinstance(llm_config_data, dict):
                        llm_config_data["openai_api_key"] = obj.openai_api_key
                        
                if hasattr(obj, "model") and obj.model:
                    if isinstance(llm_config_data, dict):
                        llm_config_data["model"] = obj.model
                
                data["llm_config"] = LLMConfig.model_validate(llm_config_data)
            # 兼容老的t2i_copilot字段
            elif hasattr(obj, "t2i_copilot") and obj.t2i_copilot:
                t2i_copilot_data = obj.t2i_copilot.copy() if isinstance(obj.t2i_copilot, dict) else obj.t2i_copilot
                data["llm_config"] = LLMConfig.model_validate(t2i_copilot_data)
            elif any(hasattr(obj, attr) and getattr(obj, attr) for attr in ["openai_url", "openai_api_key", "model"]):
                # 如果没有 llm_config 但有单独的 LLM 设置字段，创建 llm_config
                llm_config_data = {}
                if hasattr(obj, "openai_url") and obj.openai_url:
                    llm_config_data["openai_url"] = obj.openai_url
                if hasattr(obj, "openai_api_key") and obj.openai_api_key:
                    llm_config_data["openai_api_key"] = obj.openai_api_key
                if hasattr(obj, "model") and obj.model:
                    llm_config_data["model"] = obj.model
                
                if llm_config_data:
                    data["llm_config"] = LLMConfig.model_validate(llm_config_data)
            
            # 使用父类的 model_validate 方法
            return super().model_validate(data, **kwargs)
        
        # 如果是字典或者其他对象，直接使用父类方法
        return super().model_validate(obj, **kwargs)

# --- API 路由 ---
main_router = APIRouter(tags=["main"])

# --- 项目 (Projects) 相关 API ---
@main_router.get("/projects/", response_model=List[ProjectResponse])
async def get_user_projects(request: Request, db: Session = Depends(database.get_db)):
    """
    获取当前用户的所有项目
    """
    try:
        # 获取当前用户
        user = await get_current_user_from_request(request, db)
        if not user:
            raise HTTPException(status_code=401, detail="未登录用户无法获取项目")
        
        # 查询用户的所有项目（这里仅获取所有不同的project_id作为简化实现）
        projects = db.query(models.UserShot.project_id).filter(
            models.UserShot.user_id == user.user_id
        ).distinct().all()
        
        # 构建项目列表
        project_list = []
        for (project_id,) in projects:
            if project_id is not None:  # 排除None值
                project_list.append({"project_id": project_id, "name": f"项目 {project_id}"})
                
        # 确保至少有一个默认项目
        if not project_list:
            project_list.append({"project_id": 1, "name": "默认项目"})
            
        return project_list
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取用户项目列表失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="获取项目列表失败")

class ProjectCreate(BaseModel):
    """项目创建请求模型"""
    name: str

@main_router.post("/projects/", response_model=ProjectResponse)
async def create_project(project: ProjectCreate, request: Request, db: Session = Depends(database.get_db)):
    """
    创建新项目
    """
    try:
        # 获取当前用户
        user = await get_current_user_from_request(request, db)
        if not user:
            raise HTTPException(status_code=401, detail="未登录用户无法创建项目")
        
        # 查询当前最大的project_id
        max_project = db.query(models.UserShot.project_id).filter(
            models.UserShot.user_id == user.user_id
        ).order_by(models.UserShot.project_id.desc()).first()
        
        # 确定新项目的ID (最大ID+1或者1)
        new_project_id = (max_project[0] + 1) if max_project and max_project[0] else 1
        
        # 创建新项目的UserShot记录（空记录，只包含项目ID）
        new_project = models.UserShot(
            user_id=user.user_id,
            project_id=new_project_id,
            shots_order={},
            script={}
        )
        
        db.add(new_project)
        db.commit()
        
        # 返回新创建的项目信息
        return {"project_id": new_project_id, "name": project.name}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"创建项目失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="创建项目失败")

# --- 分镜 (Shots) 相关 API ---

@main_router.get("/shots/", response_model=List[ShotResponse])
async def get_shots(
    request: Request, 
    project_id: Optional[int] = Query(None, description="项目ID，不提供则使用默认项目"),
    db: Session = Depends(database.get_db)
):
    """
    获取所有分镜。
    总是按照 'order' 字段升序返回。
    可以通过project_id参数指定项目。
    """
    try:
        logger.info(f"尝试获取项目 {project_id if project_id else '默认'} 的所有分镜")
        # 获取当前用户
        user = await get_current_user_from_request(request, db)
        user_id = user.user_id if user else None
        
        logger.info(f"用户 {user_id if user_id else '未登录'} 请求获取项目 {project_id if project_id else '默认'} 的分镜")
        # 传递用户ID和项目ID到shot_service
        shots = shot_service.get_all_shots(db, user_id, project_id)
        logger.info(f"成功获取分镜，数量: {len(shots)}")
        return shots
    except Exception as e:
        logger.error(f"获取分镜时发生错误: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取分镜失败: {str(e)}")

@main_router.post("/shots/", response_model=ShotResponse)
async def create_shot_at_end(
    shot_data: ShotCreate, 
    request: Request, 
    project_id: Optional[int] = Query(None, description="项目ID，不提供则使用默认项目"),
    db: Session = Depends(database.get_db)
):
    """
    创建新分镜，并将其添加到列表末尾。
    自动计算新分镜的 order。
    可以通过project_id参数指定项目。
    """
    # 获取当前用户
    user = await get_current_user_from_request(request, db)
    user_id = user.user_id if user else None
    
    logger.info(f"用户 {user_id if user_id else '未登录'} 在项目 {project_id if project_id else '默认'} 创建新分镜")
    return shot_service.create_shot(db, shot_data.content, shot_data.t2i_prompt, user_id, project_id)

@main_router.put("/shots/{shot_id}", response_model=ShotResponse)
async def update_shot_content(
    shot_id: int, 
    shot_update: ShotUpdate, 
    request: Request, 
    project_id: Optional[int] = Query(None, description="项目ID，不提供则使用默认项目"),
    db: Session = Depends(database.get_db)
):
    """
    更新指定 ID 分镜的内容和/或提示词。
    不改变其 order。
    可以通过project_id参数指定项目。
    """
    # 获取当前用户
    user = await get_current_user_from_request(request, db)
    user_id = user.user_id if user else None
    
    logger.info(f"用户 {user_id if user_id else '未登录'} 更新项目 {project_id if project_id else '默认'} 的分镜 {shot_id}")
    return shot_service.update_shot(db, shot_id, shot_update.content, shot_update.t2i_prompt, user_id, project_id)

@main_router.delete("/shots/{shot_id}", response_model=List[ShotResponse])
async def delete_shot_and_reorder(
    shot_id: int, 
    request: Request, 
    project_id: Optional[int] = Query(None, description="项目ID，不提供则使用默认项目"),
    db: Session = Depends(database.get_db)
):
    """
    删除指定 ID 的分镜，并自动调整后续分镜的 order。
    返回删除并重新排序后的完整分镜列表。
    可以通过project_id参数指定项目。
    """
    # 获取当前用户
    user = await get_current_user_from_request(request, db)
    user_id = user.user_id if user else None
    
    logger.info(f"用户 {user_id if user_id else '未登录'} 删除项目 {project_id if project_id else '默认'} 的分镜 {shot_id}")
    return shot_service.delete_shot(db, shot_id, user_id, project_id)

@main_router.post("/shots/insert", response_model=List[ShotResponse])
async def insert_shot_and_reorder(
    request_data: InsertShotRequest, 
    request: Request, 
    project_id: Optional[int] = Query(None, description="项目ID，不提供则使用默认项目"),
    db: Session = Depends(database.get_db)
):
    """
    在指定参考分镜 ID 的上方或下方插入新分镜，并自动调整后续分镜的 order。
    返回插入并重新排序后的完整分镜列表。
    可以通过project_id参数指定项目。
    """
    # 获取当前用户
    user = await get_current_user_from_request(request, db)
    user_id = user.user_id if user else None
    
    logger.info(f"用户 {user_id if user_id else '未登录'} 在项目 {project_id if project_id else '默认'} 插入分镜到 {request_data.reference_shot_id} {request_data.position}")
    return shot_service.insert_shot(db, request_data.reference_shot_id, request_data.position, request_data.content, request_data.t2i_prompt, user_id, project_id)

@main_router.delete("/shots/", status_code=204) # 204 No Content 通常用于成功删除且无返回体
async def delete_all_shots(
    request: Request, 
    project_id: Optional[int] = Query(None, description="项目ID，不提供则使用默认项目"),
    db: Session = Depends(database.get_db)
):
    """
    删除所有分镜。
    可以通过project_id参数指定项目。
    """
    # 获取当前用户
    user = await get_current_user_from_request(request, db)
    user_id = user.user_id if user else None
    
    logger.info(f"用户 {user_id if user_id else '未登录'} 删除项目 {project_id if project_id else '默认'} 的所有分镜")
    shot_service.delete_all_shots(db, user_id, project_id)
    return # 无需返回任何内容，状态码 204 已表明成功

@main_router.put("/shots/", response_model=List[ShotResponse])
async def bulk_replace_shots(
    request_data: BulkUpdateRequest, 
    request: Request, 
    project_id: Optional[int] = Query(None, description="项目ID，不提供则使用默认项目"),
    db: Session = Depends(database.get_db)
):
    """
    批量替换所有分镜。
    先删除所有现有分镜，然后根据请求列表创建新的分镜，并按顺序分配 order。
    常用于文本导入分割后的场景。
    可以通过project_id参数指定项目。
    """
    # 获取当前用户
    user = await get_current_user_from_request(request, db)
    user_id = user.user_id if user else None
    
    logger.info(f"用户 {user_id if user_id else '未登录'} 批量替换项目 {project_id if project_id else '默认'} 的 {len(request_data.shots)} 个分镜")
    return shot_service.bulk_replace_shots(db, request_data.shots, user_id, project_id)


# --- 配置 (User Config) 相关 API ---

@main_router.get("/text/", response_model=ConfigResponse)
async def get_user_config(request: Request, db: Session = Depends(database.get_db)):
    """获取文本内容 (单条记录)"""
    # 获取当前用户
    user = await get_current_user_from_request(request, db)
    user_id = user.user_id if user else None
    
    logger.info(f"用户 {user_id if user_id else '未登录'} 获取文本配置")
    config = user_config_service.get_user_config(db, user_id)
    
    # 手动处理 llm_config 字段
    if hasattr(config, "llm_config") and config.llm_config:
        # 创建响应对象
        response_data = {
            "id": config.id,
            "created_at": config.created_at,
            "updated_at": config.updated_at,
            "global_comfyui_payload": config.global_comfyui_payload,
            "comfyui_url": config.comfyui_url,
            "llm_config": config.llm_config  # 这会在ConfigResponse.model_validate中被处理
        }
        return ConfigResponse.model_validate(response_data)
    return config

@main_router.put("/text/", response_model=ConfigResponse)
async def update_user_config(text: TextContentBase, request: Request, db: Session = Depends(database.get_db)):
    """更新文本内容和配置"""
    # 获取当前用户
    user = await get_current_user_from_request(request, db)
    user_id = user.user_id if user else None
    
    logger.info(f"用户 {user_id if user_id else '未登录'} 更新文本配置")
    
    # 如果需要，从 llm_config 中提取 OpenAI 相关字段
    llm_config_data = None
    if text.llm_config:
        # 处理 Pydantic 模型
        if hasattr(text.llm_config, "model_dump"):
            llm_config_data = text.llm_config.model_dump()
        elif hasattr(text.llm_config, "dict"):
            llm_config_data = text.llm_config.dict()
        else:
            llm_config_data = text.llm_config
    
    # 使用修改后的方法更新用户配置
    updated_config = user_config_service.update_user_config(
        db,
        text.content,
        text.global_comfyui_payload,
        text.comfyui_url,
        llm_config_data,
        user_id
    )
    
    return updated_config

# 注册主路由
app.include_router(main_router)

# 注册认证路由
app.include_router(auth_router)

# --- 可以在这里添加应用启动时的逻辑 (如果需要) ---
@app.on_event("startup")
async def startup_event():
    logger.info("应用启动...")
    # 由于已经添加了完整的用户注册功能，这里不再需要创建默认用户 