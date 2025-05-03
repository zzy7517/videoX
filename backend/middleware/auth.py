"""
身份验证中间件

这个模块实现了基于JWT的用户认证机制，包括：
1. 令牌验证
2. 获取当前登录用户
3. 用于保护API路由的依赖项

JWT（JSON Web Token）是一种基于JSON的开放标准，用于在各方之间安全地传输信息。
在这个应用中，JWT主要用于用户认证和授权。
"""
from fastapi import Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordBearer  # OAuth2密码流认证器
from jwt import PyJWTError
import jwt
from sqlalchemy.orm import Session
from typing import Optional, List
from starlette.middleware.base import BaseHTTPMiddleware
from ..database import get_db
from ..services import user_service
from ..logger import setup_logger
from ..config.auth_config import JWT_SECRET_KEY, JWT_ALGORITHM, PUBLIC_PATHS

# 设置日志
logger = setup_logger(__name__)

# OAuth2 登录表单
# tokenUrl指定获取令牌的URL端点，这里是auth/login
# 这将自动在API文档中显示一个登录表单
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

class AuthMiddleware(BaseHTTPMiddleware):
    """
    身份验证中间件
    
    验证每个请求中的JWT令牌，并提取用户信息
    """
    
    async def dispatch(self, request: Request, call_next):
        # OPTIONS 请求直接放行，解决CORS预检问题
        if request.method == "OPTIONS":
            response = await call_next(request)
            return response
            
        # 对公开路径不进行认证检查
        if any(request.url.path.startswith(path) for path in PUBLIC_PATHS):
            response = await call_next(request)
            return response
            
        # 从请求头中获取认证令牌
        auth_header = request.headers.get("Authorization")
        token = None
        
        # 初始化请求状态
        request.state.authenticated = False
        request.state.user_id = None
        
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
            
            try:
                # 解码令牌
                payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
                user_id = payload.get("sub")  # 从令牌中提取用户ID
                
                if user_id:
                    # 设置认证信息
                    request.state.authenticated = True
                    request.state.user_id = user_id
                    
                    # 继续处理请求
                    response = await call_next(request)
                    return response
                    
            except PyJWTError as e:
                logger.warning(f"令牌验证失败: {str(e)}")
                # 令牌无效，继续处理未认证状态
        
        # 用户未认证，返回401错误
        return Response(
            content='{"detail":"未授权访问"}',
            status_code=status.HTTP_401_UNAUTHORIZED,
            media_type="application/json",
            headers={"WWW-Authenticate": "Bearer"}
        )

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    验证JWT令牌并返回当前用户
    
    这个函数是一个FastAPI依赖项，用在需要用户认证的API端点上。
    
    参数:
        token: JWT令牌，由oauth2_scheme依赖自动提取
        db: 数据库会话，由get_db依赖自动提供
        
    返回:
        当前认证用户的User对象
        
    异常:
        HTTPException: 如果令牌无效或用户不存在
    
    工作流程:
    1. 从请求的Authorization头部获取Bearer令牌
    2. 解码并验证令牌
    3. 提取用户ID并查询用户
    4. 返回用户对象或抛出异常
    
    用法: 
    在需要认证的路由上添加 Depends(get_current_user)
    例如: @router.get("/protected", dependencies=[Depends(get_current_user)])
    或者: @router.get("/me", response_model=UserInfo)
          def get_me(current_user: User = Depends(get_current_user)):
              return current_user
    """
    # 定义认证失败时的异常
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="凭证无效",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # 解码令牌
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")  # 从令牌中提取用户ID
        
        if user_id is None:
            logger.warning("令牌验证失败: 无效的用户ID")
            raise credentials_exception
    except PyJWTError as e:
        # 捕获JWT解码错误，如签名无效、令牌过期等
        logger.warning(f"令牌验证失败: {str(e)}")
        raise credentials_exception
    
    # 根据令牌中的用户ID查询用户
    user = user_service.get_user_by_id(db, int(user_id))
    if user is None:
        logger.warning(f"用户验证失败: 用户ID {user_id} 不存在")
        raise credentials_exception
        
    return user

async def get_optional_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    可选验证JWT令牌，返回用户（如果已登录）或None（如果未登录）
    
    与get_current_user不同，此函数不会在用户未登录时抛出异常，
    而是返回None，适用于可以匿名访问但需要根据登录状态显示不同内容的API。
    
    参数:
        token: 可选的JWT令牌，可能为None
        db: 数据库会话
        
    返回:
        User对象或None
    
    用法: 
    在可选认证的路由上添加 Depends(get_optional_user)
    例如: @router.get("/public")
          def public_route(user: Optional[User] = Depends(get_optional_user)):
              if user:
                  return {"message": f"你好，{user.username}"}
              return {"message": "你好，访客"}
    """
    try:
        if token:
            # 如果有令牌，尝试获取用户
            return await get_current_user(token, db)
        return None
    except HTTPException:
        # 如果令牌验证失败，静默返回None而不是抛出异常
        return None

async def get_current_user_from_request(request: Request, db: Session = Depends(get_db)):
    """
    从请求状态中获取当前用户
    
    这个函数用于在经过AuthMiddleware处理后的请求中获取用户信息。
    AuthMiddleware会将解析的用户ID存储在request.state.user_id中。
    
    参数:
        request: FastAPI请求对象
        db: 数据库会话
        
    返回:
        User对象或None（如果用户未认证或用户ID无效）
    
    用法: 
    def api_endpoint(request: Request, db: Session = Depends(get_db)):
        user = await get_current_user_from_request(request, db)
        if user:
            # 用户已认证的逻辑
        else:
            # 未认证用户的逻辑
    """
    # 检查请求状态中是否有用户ID，以及是否已认证
    if hasattr(request.state, 'user_id') and hasattr(request.state, 'authenticated'):
        if request.state.authenticated and request.state.user_id:
            # 根据用户ID获取用户信息
            user = user_service.get_user_by_id(db, int(request.state.user_id))
            return user
    
    # 如果未认证或用户不存在，返回None
    return None 