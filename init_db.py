from backend.database import engine
from backend.models import Base
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db():
    logger.info("创建数据库表...")
    Base.metadata.create_all(bind=engine)
    logger.info("数据库表创建完成!")

if __name__ == "__main__":
    init_db() 