"""
用户服务模块，处理用户登录、注册和认证
 
这个模块实现了用户认证系统的核心业务逻辑，包括：
1. 用户注册
2. 密码加密和验证
3. 用户登录和令牌生成
4. 用户信息查询
"""
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from datetime import datetime, timedelta
import jwt  # 用于生成和验证JWT令牌
from passlib.context import CryptContext  # 用于密码哈希
import os
from typing import Optional, List
from ..models.user import User
from ..logger import setup_logger
from dotenv import load_dotenv
import random
import string
from ..config.auth_config import JWT_SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRATION_MINUTES
from sqlalchemy import desc
from jwt import encode as jwt_encode

# 加载环境变量
load_dotenv()

# 设置日志
logger = setup_logger(__name__)

# 密码加密上下文：使用bcrypt算法进行密码哈希
# 这样密码不会以明文形式存储在数据库中
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT令牌设置
# SECRET_KEY用于签名JWT令牌，确保令牌的安全性和有效性
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key")  # 生产环境必须设置环境变量
ALGORITHM = "HS256"  # 签名算法
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # 令牌有效期（分钟）

# 生成随机用户名
def generate_username(length=8):
    """生成随机用户名"""
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))

def generate_random_username():
    """生成随机用户名，格式为 user_xxx，其中 xxx 是6位随机字符（字母和数字）"""
    random_chars = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    return f"user_{random_chars}"

def verify_password(plain_password, hashed_password):
    """
    验证密码是否正确
    
    参数:
        plain_password: 用户输入的明文密码
        hashed_password: 数据库中存储的哈希密码
        
    返回:
        布尔值，True表示密码匹配，False表示密码不匹配
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """
    生成密码的哈希值，用于安全存储
    
    参数:
        password: 用户原始密码
        
    返回:
        加密后的密码哈希字符串
    """
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    创建JWT访问令牌
    
    参数:
        data: 要编码到令牌的数据
        expires_delta: 令牌有效期
        
    返回:
        编码后的JWT字符串
    """
    to_encode = data.copy()
    
    # 设置过期时间
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRATION_MINUTES)
    
    # 添加过期时间声明
    to_encode.update({"exp": expire})
    
    # 使用密钥和算法进行编码
    encoded_jwt = jwt_encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """
    通过邮箱查询用户
    
    参数:
        db: 数据库会话
        email: 用户邮箱
        
    返回:
        找到的User对象，如果不存在则返回None
    """
    return db.query(User).filter(User.email == email).first()

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """根据用户名查询用户"""
    return db.query(User).filter(User.username == username).first()

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """
    通过ID查询用户
    
    参数:
        db: 数据库会话
        user_id: 用户ID
        
    返回:
        找到的User对象，如果不存在则返回None
    """
    return db.query(User).filter(User.user_id == user_id).first()

def create_user(db: Session, email: str, password: str, username: Optional[str] = None):
    """
    创建新用户
    
    将明文密码哈希后存储，避免密码泄露风险
    """
    # 如果没有提供用户名，生成随机用户名
    if not username:
        username = generate_username()
        
    # 检查用户名是否已存在
    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        # 用户名已存在，生成新的随机用户名
        username = f"{username}_{generate_username(4)}"
    
    # 对密码进行哈希处理
    hashed_password = pwd_context.hash(password)
    
    # 创建用户对象
    user = User(
        email=email,
        username=username,
        password=hashed_password
    )
    
    # 保存到数据库
    db.add(user)
    db.commit()
    db.refresh(user)
    
    logger.info(f"创建新用户: {username}")
    return user

def register_user(db: Session, username: str, email: str, password: str):
    """
    注册新用户
    
    参数:
        db: 数据库会话
        username: 用户名
        email: 电子邮箱
        password: 密码（明文）
        
    返回:
        创建的User对象
        
    异常:
        HTTPException: 如果邮箱已存在或创建失败
    
    处理流程:
    1. 检查邮箱是否已被注册
    2. 对密码进行哈希处理
    3. 创建新用户对象
    4. 将用户添加到数据库并提交
    """
    # 步骤1: 检查邮箱是否已存在
    if get_user_by_email(db, email):
        logger.warning(f"注册失败：邮箱 {email} 已存在")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱已被注册"
        )
    
    # 步骤2&3: 创建新用户（密码哈希处理）
    hashed_password = get_password_hash(password)  # 对密码进行哈希处理，增加安全性
    new_user = User(
        username=username,
        email=email,
        password=hashed_password  # 存储哈希后的密码，而非明文
    )
    
    try:
        # 步骤4: 添加用户到数据库并提交
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        logger.info(f"用户 {username} 注册成功")
        return new_user
    except IntegrityError as e:
        # 处理数据库完整性错误（例如唯一约束冲突）
        db.rollback()
        logger.error(f"用户注册失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="用户创建失败，请稍后重试"
        )

def authenticate_user(db: Session, email: str, password: str):
    """
    验证用户身份并生成访问令牌
    
    参数:
        db: 数据库会话
        email: 用户邮箱
        password: 用户密码（明文）
        
    返回:
        包含访问令牌和用户信息的字典
        
    异常:
        HTTPException: 如果验证失败
    
    处理流程:
    1. 通过邮箱查找用户
    2. 验证密码是否正确
    3. 更新登录时间
    4. 生成访问令牌
    """
    # 步骤1&2: 查找用户并验证密码
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.password):
        logger.warning(f"登录失败：邮箱 {email} 认证失败")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码不正确",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 步骤3: 更新登录时间
    user.update_last_login()
    db.commit()
    
    # 步骤4: 生成访问令牌
    access_token_expires = timedelta(minutes=JWT_EXPIRATION_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.user_id)},  # "sub"是JWT标准声明，表示主题（通常是用户ID）
        expires_delta=access_token_expires
    )
    
    logger.info(f"用户 {user.username} 登录成功")
    # 返回令牌和用户信息
    return {
        "access_token": access_token,  # JWT令牌
        "token_type": "bearer",        # 令牌类型
        "user_id": user.user_id,       # 用户ID
        "username": user.username      # 用户名
    }

def login_or_register(db: Session, email: str, password: str):
    """
    登录或自动注册
    
    如果用户存在则验证密码并登录，否则自动创建新用户并登录
    """
    # 尝试获取用户
    user = get_user_by_email(db, email)
    
    if user:
        # 用户存在，验证密码
        if not verify_password(password, user.password):
            logger.warning(f"登录失败：邮箱 {email} 密码不正确")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="邮箱或密码不正确",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.info(f"用户 {user.username} 登录成功")
    else:
        # 用户不存在，自动创建新用户
        random_username = generate_random_username()
        hashed_password = get_password_hash(password)
        user = User(
            username=random_username,
            email=email,
            password=hashed_password
        )
        
        try:
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"用户 {random_username} 自动注册并登录成功")
        except IntegrityError as e:
            db.rollback()
            logger.error(f"自动注册失败: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="用户创建失败，请稍后重试"
            )
    
    # 更新登录时间
    user.update_last_login()
    db.commit()
    
    # 创建访问令牌
    access_token_expires = timedelta(minutes=JWT_EXPIRATION_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.user_id)}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "user_id": user.user_id, 
        "username": user.username,
        "is_new_user": user is not None and not get_user_by_email(db, email)
    } 