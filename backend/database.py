from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .logger import setup_logger
import os
import psycopg2
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

logger = setup_logger(__name__)

# 获取Supabase数据库连接信息
USER = os.getenv("user")
PASSWORD = os.getenv("password")
HOST = os.getenv("host")
PORT = os.getenv("port")
DBNAME = os.getenv("dbname")

# 构建连接字符串
db_url = f"postgresql://{USER}:{PASSWORD}@{HOST}:{PORT}/{DBNAME}"

logger.info(f"初始化数据库连接: {HOST}:{PORT}/{DBNAME}")

# 使用SQLAlchemy连接
engine = create_engine(db_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """获取数据库会话"""
    logger.debug("创建新的数据库会话")
    db = SessionLocal()
    try:
        yield db
    finally:
        logger.debug("关闭数据库会话")
        db.close()

def get_connection():
    """获取原生psycopg2连接，用于复杂操作"""
    logger.debug("创建新的psycopg2直接连接")
    conn = psycopg2.connect(
        user=USER,
        password=PASSWORD,
        host=HOST,
        port=PORT,
        dbname=DBNAME
    )
    return conn 