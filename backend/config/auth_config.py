"""
认证配置模块

集中管理与认证相关的配置项，如JWT密钥、算法等。
"""
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# JWT认证配置
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key")  # 生产环境必须修改此默认值
JWT_ALGORITHM = "HS256"  # JWT签名算法
JWT_EXPIRATION_MINUTES = 60  # 令牌过期时间（分钟）

# 无需认证的公开路径
PUBLIC_PATHS = [
    "/auth/login",
    "/auth/register",
    "/auth/login_or_register",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/health"
] 