from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from backend.api import app as backend_app
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response, JSONResponse
from backend.config.auth_config import JWT_SECRET_KEY, JWT_ALGORITHM, PUBLIC_PATHS

# OAuth2密码授权方案
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# 创建主应用
app = FastAPI(title="VideoX API Gateway")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该设置具体的源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 创建认证信息传递中间件
class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # 允许所有OPTIONS请求通过，这是CORS预检请求
        if request.method == "OPTIONS":
            return await call_next(request)
            
        # 检查是否是认证相关的路径，这些路径无需认证
        path = request.url.path
        if any(path.startswith(auth_path) for auth_path in PUBLIC_PATHS):
            # 认证相关路径，允许继续请求
            return await call_next(request)
            
        # 从请求头中获取Authorization信息
        auth_header = request.headers.get("Authorization")
        
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
            try:
                # 验证token并解析用户信息
                payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
                user_id = payload.get("sub")
                
                # 将用户信息添加到请求State中
                request.state.user_id = user_id
                request.state.authenticated = True
                
                # 继续处理请求
                return await call_next(request)
            except JWTError:
                # Token无效，返回401未授权
                return JSONResponse(
                    status_code=401,
                    content={"detail": "无效的认证凭据"}
                )
        else:
            # 没有Authorization头，返回401未授权
            return JSONResponse(
                status_code=401,
                content={"detail": "需要认证"}
            )

# 添加认证中间件
app.add_middleware(AuthMiddleware)

# 挂载后端应用
app.mount("/", backend_app)

@app.get("/health", tags=["system"])
async def health_check():
    """健康检查接口"""
    return {
        "status": "ok", 
        "message": "VideoX API is running",
        "version": "1.0.0"
    }

# 应用启动入口
if __name__ == "__main__":
    print("启动 VideoX 服务器...")
    uvicorn.run(app, host="0.0.0.0", port=8000) 