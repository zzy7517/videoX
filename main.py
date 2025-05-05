from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from backend.api import app as backend_app
from backend.middleware.auth import AuthMiddleware
from backend.middleware.logging import LoggingMiddleware
import logging

# 设置FastAPI日志级别为DEBUG
logging.basicConfig(level=logging.DEBUG)

# 创建主应用
app = FastAPI(title="VideoX API Gateway", debug=True)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该设置具体的源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 添加日志中间件
app.add_middleware(LoggingMiddleware)

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
    # 启用详细的错误信息
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="debug")