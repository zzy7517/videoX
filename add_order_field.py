import os
import psycopg2
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 获取数据库连接信息
user = os.getenv('user')
password = os.getenv('password')
host = os.getenv('host')
port = os.getenv('port')
dbname = os.getenv('dbname')

print("准备向shots表添加order字段")

try:
    # 连接到数据库
    conn = psycopg2.connect(
        user=user,
        password=password,
        host=host,
        port=port,
        dbname=dbname
    )
    
    # 设置自动提交
    conn.autocommit = True
    
    # 创建一个游标对象
    cursor = conn.cursor()
    
    # 检查order字段是否存在
    cursor.execute("""
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'shots' AND column_name = 'order';
    """)
    
    if cursor.fetchone():
        print("order字段已存在，无需添加")
    else:
        # 添加order字段
        cursor.execute("""
        ALTER TABLE shots ADD COLUMN "order" INTEGER DEFAULT 1 NOT NULL;
        """)
        print("成功添加order字段")
    
    # 关闭连接
    cursor.close()
    conn.close()
    print("操作完成，连接已关闭")
    
except Exception as e:
    print(f"发生错误: {e}") 