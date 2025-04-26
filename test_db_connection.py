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

# 打印连接信息（隐藏密码）
print("连接信息：")
print(f"user: {user}")
print(f"host: {host}")
print(f"port: {port}")
print(f"dbname: {dbname}")
print(f"password: {'*' * 16}")
print()

try:
    # 连接到数据库
    conn = psycopg2.connect(
        user=user,
        password=password,
        host=host,
        port=port,
        dbname=dbname
    )
    
    # 创建一个游标对象
    cursor = conn.cursor()
    
    print("连接成功！")
    
    # 查询当前时间
    cursor.execute("SELECT NOW();")
    record = cursor.fetchone()
    print(f"当前时间: {record}")
    
    # 查询shots表中的记录数
    cursor.execute("SELECT COUNT(*) FROM shots;")
    count = cursor.fetchone()
    print(f"shots表中的记录数: {count[0]}")
    
    # 查询shots表的结构
    cursor.execute("""
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'shots'
    ORDER BY ordinal_position;
    """)
    
    columns = cursor.fetchall()
    print("\nshots表的结构:")
    for column in columns:
        print(f"列名: {column[0]}, 类型: {column[1]}, 默认值: {column[2]}")
    
    # 关闭连接
    cursor.close()
    conn.close()
    print("连接已关闭。")
    
except Exception as e:
    print(f"错误: {e}") 