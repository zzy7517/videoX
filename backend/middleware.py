import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from .logger import setup_logger

logger = setup_logger("middleware")

class LoggingMiddleware(BaseHTTPMiddleware):
    """
    记录所有请求和响应的中间件
    包含请求路径、方法、处理时间、状态码等信息
    """
    
    async def dispatch(self, request: Request, call_next):
        # 记录请求开始时间
        start_time = time.time()
        
        # 记录请求信息
        client_host = request.client.host if request.client else "unknown"
        request_id = request.headers.get("X-Request-ID", "")
        logger.info(
            f"收到请求 | 路径: {request.url.path} | "
            f"方法: {request.method} | "
            f"客户端: {client_host} | "
            f"请求ID: {request_id}"
        )
        
        # 调用下一个中间件或路由处理函数
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # 记录响应信息
            logger.info(
                f"请求完成 | 路径: {request.url.path} | "
                f"方法: {request.method} | "
                f"状态码: {response.status_code} | "
                f"处理时间: {process_time:.4f}秒 | "
                f"请求ID: {request_id}"
            )
            
            # 添加处理时间到响应头
            response.headers["X-Process-Time"] = str(process_time)
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                f"请求异常 | 路径: {request.url.path} | "
                f"方法: {request.method} | "
                f"处理时间: {process_time:.4f}秒 | "
                f"错误: {str(e)} | "
                f"请求ID: {request_id}"
            )
            raise 