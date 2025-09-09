# AI 电商图像工作室

专为电商产品图片设计的全栈 AI 图像编辑平台，集成多模型AI支持（Gemini、Sora、ChatGPT），提供场景化智能处理和专业级图像优化。

## ✨ 核心功能

### 🎯 场景模式（推荐）
- **智能场景识别**：根据产品类型自动推荐最适合的处理方案
- **一键功能执行**：预设的专业处理模板，无需复杂配置
- **多样化场景**：电商产品、艺术创作、专业摄影等多种使用场景
- **智能功能推荐**：基于场景特点推荐最佳处理功能

### 🖼️ 图像编辑模式
- **一键优化**：自动增强产品图片，提供白色背景、改善光照和专业风格
- **AI 背景替换**：使用自然语言提示更改背景
- **多轮编辑**：具有上下文记忆的连续编辑，实现迭代改进
- **自定义提示**：支持详细的编辑指令输入

### 🎨 文生图模式
- **文本到图像生成**：基于描述生成高质量产品图像
- **多种风格支持**：支持不同的艺术风格和图像尺寸
- **专业模板**：内置电商产品图像生成模板

### 🚀 高级特性
- **多模型AI支持**：
  - **Gemini 2.5 Flash**（专业级）：最高质量输出，适合专业产品摄影
  - **Sora Image**（创意级）：创意艺术处理和视觉效果
  - **ChatGPT Vision**（标准级）：日常图像编辑和基础优化
- **智能模型选择**：基于任务类型自动选择最适合的AI模型
- **实时处理反馈**：通过SSE和智能轮询提供实时进度更新
- **API配置管理**：支持多套API配置，加密存储，连接测试
- **导出选项**：多种格式（JPG、PNG、WebP）和尺寸选项

## 技术栈

### 后端
- **运行环境**：Node.js + Express + TypeScript
- **数据库**：PostgreSQL（增强6表架构）+ Redis
- **AI 服务**：多模型支持
  - Google Gemini 2.5 Flash API（主推荐）
  - Sora Image API（创意处理）
  - ChatGPT Vision API（通用处理）
- **图像处理**：Sharp + 增强安全性验证
- **存储**：本地文件系统（带自动清理）
- **实时通信**：Server-Sent Events + 智能轮询混合

### 前端
- **框架**：React 18 + TypeScript + Vite
- **样式**：Tailwind CSS + Framer Motion（动画）
- **状态管理**：Zustand
- **图像上传**：React Dropzone
- **图标**：Lucide React
- **UI增强**：毛玻璃效果、深色主题、响应式设计

## 快速开始

### 环境要求
- Node.js 18+
- pnpm（推荐包管理器）
- PostgreSQL 12+
- Redis 6+（可选，用于缓存）
- AI API密钥（Gemini、Sora或ChatGPT之一）

### 安装步骤

1. **克隆和安装**
```bash
git clone <repository-url>
cd EcommerceGraphicDesigner

# 使用 pnpm 安装所有依赖
pnpm install
pnpm run install:all
```

2. **数据库设置**
```bash
# 创建 PostgreSQL 数据库
createdb ecommerce_graphic_designer

# 配置环境变量
cd backend
cp .env.example .env
# 编辑 .env 文件，配置数据库 URL 和 API 密钥
```

3. **环境配置**
```bash
# 后端配置 (.env)
NODE_ENV=development
PORT=3005
DATABASE_URL=postgresql://localhost:5432/ecommerce_graphic_designer
REDIS_URL=redis://localhost:6379
GOOGLE_API_KEY=your_api_key_here
GEMINI_API_URL=https://api.laozhang.ai/v1/chat/completions
RUN_MIGRATIONS=true
MAX_FILE_SIZE=10485760
MAX_IMAGE_DIMENSION=4096
```

4. **启动开发服务器**
```bash
# 从项目根目录
pnpm run dev

# 这将启动：
# - 后端服务器：http://localhost:3005
# - 前端应用：http://localhost:3001
```

## 📚 API 文档

### 核心端点

#### 图像处理
- `POST /api/upload` - 上传产品图片
- `POST /api/session` - 创建编辑会话  
- `POST /api/edit` - 启动AI增强任务（传统模式）
- `POST /api/edit/feature` - 执行场景功能（场景模式）
- `POST /api/edit/refine` - 优化现有变体
- `POST /api/generate` - 文本生成图像

#### 任务状态
- `GET /api/job/{id}` - 获取任务状态
- `GET /api/job/{id}/variants` - 获取任务结果变体
- `GET /api/job/stream/{id}` - SSE 进度流

#### 场景功能
- `GET /api/scenarios` - 获取所有场景
- `GET /api/scenarios/{id}` - 获取特定场景
- `GET /api/scenarios/features/all` - 获取所有功能

#### 系统管理  
- `GET /api/config` - 获取API配置
- `POST /api/config` - 创建/更新API配置
- `POST /api/config/{id}/test` - 测试API配置连接
- `POST /api/image/{id}/export` - 导出自定义尺寸

### 使用示例

```javascript
// 1. 上传图片
const formData = new FormData();
formData.append('image', file);
const uploadResult = await fetch('/api/upload', {
  method: 'POST', 
  body: formData
});

// 2. 创建会话
const sessionResult = await fetch('/api/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    project_id: uploadResult.project_id,
    context: { scenario_mode: true }
  })
});

// 3A. 场景模式 - 执行功能
const featureResult = await fetch('/api/edit/feature', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session_id: sessionId,
    image_id: imageId,
    feature_id: 'background_removal',
    custom_prompt: '保持产品主体，创建白色背景'
  })
});

// 3B. 传统模式 - 自由编辑
const editResult = await fetch('/api/edit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session_id: sessionId,
    image_id: imageId, 
    type: 'optimize'
  })
});

// 4. 监控处理进度
const eventSource = new EventSource(`/api/job/stream/${jobId}`);
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Progress:', data.progress);
  if (data.status === 'done') {
    console.log('Results:', data.result_variants);
  }
};
```

## 🚀 部署

### Docker 部署（推荐）

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 运行迁移
docker-compose exec backend pnpm run migrate
```

### 手动部署

1. **构建应用**
```bash
pnpm run build
```

2. **启动生产服务器**
```bash
cd backend
pnpm start
```

3. **前端服务**（nginx 示例）
```nginx
server {
    listen 80;
    root /path/to/frontend/dist;
    
    location /api {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /static {
        proxy_pass http://localhost:3005;
    }
}
```

## 🔧 开发

### 项目结构
```
├── backend/                 # Node.js API 服务器
│   ├── src/
│   │   ├── routes/         # API 路由
│   │   │   ├── edit.ts     # 传统编辑模式
│   │   │   ├── featureEdit.ts  # 场景功能模式
│   │   │   ├── scenarios.ts    # 场景管理
│   │   │   ├── generate.ts     # 文生图功能
│   │   │   └── config.ts       # API配置管理
│   │   ├── models/         # 数据库模型
│   │   │   ├── index.ts        # 核心模型
│   │   │   └── scenarioModels.ts # 场景模型
│   │   ├── services/       # 业务逻辑
│   │   │   ├── aiServiceFactory.ts # AI模型工厂
│   │   │   ├── gemini.ts           # Gemini集成
│   │   │   ├── sora.ts             # Sora集成
│   │   │   └── chatgpt.ts          # ChatGPT集成
│   │   └── utils/          # 工具函数
│   └── migrations/         # 数据库迁移（7个迁移文件）
├── frontend/               # React 应用
│   ├── src/
│   │   ├── components/     # React 组件
│   │   │   ├── ScenarioApp.tsx     # 场景模式主应用
│   │   │   ├── ScenarioSelector.tsx # 场景选择器
│   │   │   ├── ScenarioImageEditor.tsx # 场景图像编辑器
│   │   │   ├── ImageEditor.tsx     # 传统编辑器
│   │   │   ├── TextToImageGenerator.tsx # 文生图组件
│   │   │   └── VariantGallery.tsx  # 结果展示
│   │   ├── services/       # API 客户端
│   │   ├── stores/         # Zustand 状态存储
│   │   │   ├── appStore.ts         # 应用主状态
│   │   │   └── apiConfigStore.ts   # API配置状态
│   │   └── types/          # TypeScript 类型
└── storage/                # 本地文件存储
    ├── uploads/            # 原始图片
    ├── results/            # AI 处理后的图片
    ├── thumbnails/         # 图片预览
    └── exports/            # 下载文件（24小时 TTL）
```

### 关键功能实现

**🎯 场景模式处理流程：**
1. 场景选择 → 用户从预设场景中选择（电商产品、艺术创作等）
2. 功能选择 → 根据场景推荐最适合的处理功能
3. 智能执行 → 系统自动选择最佳AI模型执行功能
4. 实时反馈 → 通过轮询机制显示处理进度
5. 结果展示 → 自动显示高质量处理结果

**🖼️ 传统编辑流程：**
1. 上传 → 创建项目和会话
2. 提交编辑任务 → 通过AI API排队处理
3. 处理 → 生成多个带评分的变体
4. 返回 → 显示带缩略图的排名结果
5. 导出 → 自定义平台尺寸

**🚀 多模型AI架构：**
- **智能模型选择**：基于任务类型和质量要求自动选择模型
- **能力矩阵**：Gemini（专业）> Sora（创意）> ChatGPT（标准）
- **fallback机制**：模型不可用时自动切换到备用模型
- **retry逻辑**：失败时指数退避重试，最多3次

**💾 数据库架构（6表设计）：**
- **projects**：项目管理
- **sessions**：编辑会话，支持多轮编辑上下文
- **images**：图像元数据，包含场景标签
- **jobs**：任务队列，增强状态跟踪
- **variants**：AI生成的变体结果
- **api_configurations**：加密API配置管理

**🔄 实时通信系统：**
- **智能切换**：浏览器环境检测，Chrome localhost自动使用轮询
- **SSE + 轮询混合**：最佳兼容性和可靠性
- **断线重连**：自动恢复连接，状态同步
- **进度追踪**：详细的处理阶段反馈

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

### 开发指南

- 使用 **pnpm** 作为包管理器
- 遵循现有的代码风格和TypeScript类型
- 新功能需要添加适当的测试
- API变更需要更新文档

## 📄 许可证

该项目基于 MIT 许可证授权 - 详见 [LICENSE](LICENSE) 文件。

---

## 🚀 快速体验

1. **克隆项目**：`git clone <repository-url>`
2. **安装依赖**：`pnpm run install:all`
3. **配置环境**：复制 `.env.example` 并填入API密钥
4. **启动服务**：`pnpm run dev`
5. **访问应用**：http://localhost:3001

**推荐使用场景模式**获得最佳体验！🎨✨