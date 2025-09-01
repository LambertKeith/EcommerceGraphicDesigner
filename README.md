# AI 电商图像编辑器

专为电商产品图片设计的强大 AI 图像编辑器，基于 Gemini 2.5 Flash 构建。

## 功能特性

- **一键优化**：自动增强产品图片，提供白色背景、改善光照和专业风格
- **AI 背景替换**：使用自然语言提示更改背景
- **多轮编辑**：具有上下文记忆的连续编辑，实现迭代改进
- **导出选项**：多种格式和尺寸选项，专为电商平台优化
- **实时处理**：通过 Server-Sent Events 提供实时进度更新

## 技术栈

### 后端
- **运行环境**：Node.js + Express + TypeScript
- **数据库**：PostgreSQL + Redis
- **AI 服务**：Google Gemini 2.5 Flash API
- **图像处理**：Sharp
- **存储**：本地文件系统

### 前端
- **框架**：React 18 + TypeScript + Vite
- **样式**：Tailwind CSS
- **状态管理**：Zustand
- **图像上传**：React Dropzone
- **图标**：Lucide React

## 快速开始

### 环境要求
- Node.js 18+
- PostgreSQL 12+
- Redis 6+
- Google Gemini API 密钥

### 安装步骤

1. **克隆和安装**
```bash
git clone <repository-url>
cd EcommerceGraphicDesigner
npm install
cd backend && npm install
cd ../frontend && npm install
```

2. **数据库设置**
```bash
# 创建 PostgreSQL 数据库
createdb ecommerce_graphic_designer

# 运行迁移
cd backend
cp .env.example .env
# 编辑 .env 文件，配置数据库 URL 和 API 密钥
npm run migrate
```

3. **环境配置**
```bash
# 后端配置 (.env)
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://localhost:5432/ecommerce_graphic_designer
REDIS_URL=redis://localhost:6379
GOOGLE_API_KEY=your_gemini_api_key_here
RUN_MIGRATIONS=true
```

4. **启动开发服务器**
```bash
# 从项目根目录
npm run dev
# 这将同时启动后端（端口 3001）和前端（端口 3000）
```

## API 文档

### 核心端点

- `POST /api/upload` - 上传产品图片
- `POST /api/session` - 创建编辑会话
- `POST /api/edit` - 启动 AI 增强任务
- `GET /api/job/{id}` - 获取任务状态
- `GET /api/job/stream/{id}` - SSE 进度流
- `POST /api/edit/refine` - 优化现有变体
- `POST /api/image/{id}/export` - 导出自定义尺寸

### 使用示例

```javascript
// 上传图片
const formData = new FormData();
formData.append('image', file);
const uploadResult = await fetch('/api/upload', {
  method: 'POST', 
  body: formData
});

// 启动优化
const editResult = await fetch('/api/edit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session_id: sessionId,
    image_id: imageId, 
    type: 'optimize'
  })
});
```

## 部署

### Docker 部署（推荐）

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 运行迁移
docker-compose exec backend npm run migrate
```

### 手动部署

1. **构建应用**
```bash
npm run build
```

2. **启动生产服务器**
```bash
cd backend
npm start
```

3. **前端服务**（nginx 示例）
```nginx
server {
    listen 80;
    root /path/to/frontend/dist;
    
    location /api {
        proxy_pass http://localhost:3001;
    }
    
    location /static {
        proxy_pass http://localhost:3001;
    }
}
```

## 开发

### 项目结构
```
├── backend/                 # Node.js API 服务器
│   ├── src/
│   │   ├── controllers/     # 路由处理器
│   │   ├── models/         # 数据库模型
│   │   ├── services/       # 业务逻辑
│   │   ├── routes/         # API 路由
│   │   └── utils/          # 工具函数
│   └── migrations/         # 数据库迁移
├── frontend/               # React 应用
│   ├── src/
│   │   ├── components/     # React 组件
│   │   ├── services/       # API 客户端
│   │   ├── stores/         # Zustand 状态存储
│   │   └── types/          # TypeScript 类型
└── storage/                # 本地文件存储
    ├── uploads/            # 原始图片
    ├── results/            # AI 处理后的图片
    ├── thumbnails/         # 图片预览
    └── exports/            # 下载文件（24小时 TTL）
```

### 关键功能实现

**AI 图像处理流程：**
1. 上传 → 创建项目和会话
2. 提交编辑任务 → 通过 Gemini API 排队
3. 处理 → 生成多个带评分的变体
4. 返回 → 显示带缩略图的排名结果
5. 导出 → 自定义平台尺寸

**多轮编辑：**
- 会话上下文保留编辑历史
- 每次优化都基于之前的结果
- 保持跨迭代的视觉一致性

## 贡献

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 许可证

该项目基于 MIT 许可证授权 - 详见 [LICENSE](LICENSE) 文件。