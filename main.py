from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from backend.api import app as backend_app

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