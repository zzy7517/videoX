# VideoX

VideoX是一个用于视频分镜的应用程序，帮助用户进行视频内容的分镜管理和文本处理。

## 技术栈

### 后端
- FastAPI: 高性能的Python Web框架
- SQLAlchemy: ORM数据库操作库
- Uvicorn: ASGI服务器
- PostgreSQL: 数据库

### 前端
- Next.js 15.3.1: React框架
- React 19: UI库
- TailwindCSS: CSS框架
- Radix UI: 组件库

## 项目结构

```
videoX/
├── backend/                  # 后端代码
│   ├── __init__.py           # 包初始化文件
│   ├── api.py                # API定义和路由
│   ├── database.py           # 数据库配置
│   ├── logger.py             # 日志配置
│   ├── middleware.py         # 中间件
│   ├── models/               # 数据模型
│   │   ├── shot.py           # 分镜模型
│   │   ├── text_content.py   # 文本内容模型
│   │   ├── user.py           # 用户模型
│   │   └── ...               # 其他模型
│   └── services/             # 业务逻辑服务
├── frontend/                 # 前端代码
│   ├── public/               # 静态资源
│   ├── src/                  # 源代码
│   │   ├── app/              # Next.js应用
│   │   ├── components/       # React组件
│   │   └── lib/              # 工具函数
│   ├── package.json          # 前端依赖配置
│   └── next.config.ts        # Next.js配置
├── logs/                     # 日志文件夹
├── main.py                   # 应用入口
├── init_db.py                # 数据库初始化
└── requirements.txt          # 后端依赖项
```

## 功能特点

- 分镜管理：创建、编辑、删除视频分镜
- 批量导入：支持批量导入文本并自动转换为分镜
- 用户系统：支持多用户使用
- API接口：提供完整的RESTful API

## 安装指南

### 环境要求
- Python 3.8+
- Node.js 18+
- PostgreSQL数据库

### 后端安装
1. 克隆仓库
   ```bash
   git clone <仓库地址>
   cd videoX
   ```

2. 安装Python依赖
   ```bash
   pip install -r requirements.txt
   ```

3. 初始化数据库
   ```bash
   python init_db.py
   ```

### 前端安装
1. 进入前端目录
   ```bash
   cd frontend
   ```

2. 安装Node.js依赖
   ```bash
   npm install
   ```

## 启动应用

### 启动后端服务
```bash
python main.py
```
服务将在 http://localhost:8000 运行

### 启动前端开发服务器
```bash
cd frontend
npm run dev
```
前端将在 http://localhost:3000 运行

## API文档

启动后端服务后，可通过以下URL访问API文档：

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 主要API端点

- `GET /shots/`: 获取所有分镜
- `POST /shots/`: 创建新分镜
- `PUT /shots/{shot_id}`: 更新指定分镜
- `DELETE /shots/{shot_id}`: 删除指定分镜
- `POST /shots/insert/`: 在指定位置插入分镜
- `GET /text/`: 获取文本内容
- `PUT /text/`: 更新文本内容

## 开发

### 运行测试
```bash
# 待添加
```

### 构建生产版本
```bash
# 构建前端
cd frontend
npm run build

# 部署后端
# 使用生产级服务器如Gunicorn
```

## 许可证

[待添加] 