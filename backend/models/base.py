"""模型基类"""
from sqlalchemy.ext.declarative import declarative_base

# 创建基础模型类，所有模型都从这个类继承
Base = declarative_base() 