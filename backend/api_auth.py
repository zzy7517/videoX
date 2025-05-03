"""
认证API路由，处理用户登录和注册

这个模块实现了以下功能的API端点：
1. 用户注册
2. 用户登录
3. 获取当前登录用户信息

这些API端点构成了应用的认证系统，使用JWT令牌进行身份验证。
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm  # OAuth2密码流表单
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

from .database import get_db
from .services import user_service
from .models.user import User
from .middleware.auth import get_current_user
from .logger import setup_logger

# 设置日志
logger = setup_logger(__name__)

# 创建路由器，指定前缀和标签
# 前缀表示所有路由URL都将以/auth开头
# 标签用于在OpenAPI文档中分组
auth_router = APIRouter(prefix="/auth", tags=["auth"])

# --- Pydantic 模型 ---
# 这些模型用于请求和响应的数据验证和序列化

class UserBase(BaseModel):
    """
    用户基础模型
    
    包含用户的基本信息字段
    被其他模型继承
    """
    email: EmailStr  # 使用EmailStr类型，会自动验证邮箱格式
    username: str

class UserCreate(UserBase):
    """
    用户创建模型，用于注册请求
    
    继承UserBase，添加密码字段
    """
    password: str = Field(..., min_length=6)  # 密码最少6个字符，...表示必填字段

class UserResponse(UserBase):
    """
    用户响应模型，用于返回给客户端的用户信息
    
    继承UserBase，添加用户ID
    不包含敏感信息如密码
    """
    user_id: int

    class Config:
        # 允许从ORM模型直接创建响应
        from_attributes = True

class LoginResponse(BaseModel):
    """
    登录响应模型，用于登录成功后返回的数据
    
    包含访问令牌和用户基本信息
    """
    access_token: str    # JWT访问令牌
    token_type: str      # 令牌类型，固定为"bearer"
    user_id: int         # 用户ID
    username: str        # 用户名
    is_new_user: Optional[bool] = False

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    """登录请求模型"""
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserInfo(BaseModel):
    """
    用户信息模型，用于返回当前登录用户的详细信息
    
    包含用户ID、用户名和电子邮箱
    """
    user_id: int
    username: str
    email: str

    class Config:
        from_attributes = True

# --- 路由 ---

@auth_router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """
    注册新用户
    
    接收用户注册信息，创建新用户，并返回创建的用户信息（不含密码）
    
    路径: POST /auth/register
    
    参数:
        user: 包含用户名、邮箱和密码的用户创建模型
        db: 数据库会话依赖
        
    返回:
        201 Created: 创建成功的用户信息
        
    异常:
        400 Bad Request: 邮箱已被注册
        500 Internal Server Error: 用户创建失败
    """
    logger.info(f"尝试注册用户: {user.email}")
    return user_service.register_user(db, user.username, user.email, user.password)

@auth_router.post("/login", response_model=LoginResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    用户登录
    
    验证用户凭证，并在成功时返回访问令牌
    
    路径: POST /auth/login
    
    参数:
        form_data: OAuth2密码表单，包含username和password字段
        db: 数据库会话依赖
        
    返回:
        200 OK: 包含访问令牌和用户信息的响应
        
    异常:
        401 Unauthorized: 用户名/密码错误或账户已禁用
        
    注意:
        这个端点使用OAuth2PasswordRequestForm，它会将电子邮箱作为username字段提交
    """
    logger.info(f"尝试登录: {form_data.username}")
    # 注意：OAuth2表单使用username字段，但我们将其视为邮箱
    return user_service.authenticate_user(db, form_data.username, form_data.password)

@auth_router.post("/login_or_register", response_model=LoginResponse)
def login_or_register(form_data: LoginRequest, db: Session = Depends(get_db)):
    """
    用户登录或自动注册
    
    如果用户不存在，则自动创建新用户并登录。
    否则，验证密码并登录现有用户。
    """
    logger.info(f"尝试自动登录或注册: {form_data.email}")
    return user_service.login_or_register(db, form_data.email, form_data.password)

@auth_router.get("/me", response_model=UserInfo)
def get_user_me(current_user: User = Depends(get_current_user)):
    """
    获取当前登录用户信息
    
    返回当前经过身份验证的用户详细信息
    
    路径: GET /auth/me
    
    参数:
        current_user: 当前认证用户，由get_current_user依赖提供
        
    返回:
        200 OK: 当前用户的详细信息
        
    异常:
        401 Unauthorized: 未认证或令牌无效
        
    注意:
        这个端点需要在请求头部包含有效的Bearer令牌：
        Authorization: Bearer <token>
    """
    logger.info(f"获取用户信息: {current_user.user_id}")
    return current_user 