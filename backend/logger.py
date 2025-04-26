import logging
import os
import sys
import traceback
from datetime import datetime
import inspect

# 创建logs目录（如果不存在）
log_dir = "logs"
if not os.path.exists(log_dir):
    os.makedirs(log_dir)

# 配置日志记录器
def setup_logger(name):
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    # 防止日志重复
    if logger.handlers:
        return logger

    # 创建格式化器
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d:%(funcName)s] - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # 文件处理器 - 按日期创建日志文件
    today = datetime.now().strftime('%Y-%m-%d')
    file_handler = logging.FileHandler(f'{log_dir}/{today}.log', encoding='utf-8')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # 控制台处理器
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    return logger

def get_caller_info():
    """获取调用者的文件名、行号和函数名"""
    frame = inspect.currentframe().f_back.f_back
    filename = os.path.basename(frame.f_code.co_filename)
    lineno = frame.f_lineno
    func_name = frame.f_code.co_name
    return f"{filename}:{lineno}:{func_name}"

def log_exception(logger, error_message="发生异常"):
    """记录详细的异常信息，包括堆栈跟踪"""
    exc_type, exc_value, exc_traceback = sys.exc_info()
    stack_trace = ''.join(traceback.format_exception(exc_type, exc_value, exc_traceback))
    
    caller_info = get_caller_info()
    logger.error(f"{error_message} - 位置: {caller_info}\n{stack_trace}") 