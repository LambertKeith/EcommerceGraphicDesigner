# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Environment Setup
```bash
# Install all dependencies (root, backend, frontend) using pnpm
pnpm run install:all

# OR install manually
pnpm install
cd backend && pnpm install  
cd ../frontend && pnpm install

# Create backend environment file
cd backend
cp .env.example .env
# Edit .env with your database URL, Redis URL, and Google Gemini API key
```

### Development
```bash
# Start both backend and frontend in development mode
pnpm run dev

# Start individual services
pnpm run dev:backend    # Backend only (port 3001)
pnpm run dev:frontend   # Frontend only (port 3000)
```

### Database Operations
```bash
# Run database migrations (requires RUN_MIGRATIONS=true in .env)
cd backend
pnpm run dev  # Migrations run automatically on server start
```

### Building and Testing
```bash
# Build entire project
pnpm run build

# Build individual services
pnpm run build:backend
pnpm run build:frontend

# Run tests
pnpm test                    # All tests
pnpm run test:backend       # Backend Jest tests
pnpm run test:frontend      # Frontend Vitest tests
cd frontend && pnpm run test:watch  # Watch mode for frontend tests

# Linting
cd backend && pnpm run lint     # Check backend code
cd backend && pnpm run lint:fix # Fix backend linting issues
cd frontend && pnpm run lint    # Check frontend code
cd frontend && pnpm run lint:fix # Fix frontend linting issues
```

### Docker Deployment
```bash
# Start with Docker Compose
docker-compose up -d

# Run database migrations in Docker
docker-compose exec backend pnpm run migrate
```

## Architecture Overview

### System Design
This is a full-stack AI-powered e-commerce image editor with multi-model AI support (Gemini, Sora, ChatGPT). The application processes product images through AI enhancement with real-time progress tracking and intelligent model selection.

**Flow**: Image Upload → Project/Session Creation → AI Model Selection → Processing Job → Single High-Quality Variant → Download Modal

### Backend Architecture (`backend/`)

**Core Services:**
- `services/database.ts` - PostgreSQL connection and migration runner
- `services/fileStorage.ts` - Local file system management (uploads, results, thumbnails, exports) 
- `services/aiService.ts` - Abstract base class for unified AI service interface
- `services/aiServiceFactory.ts` - Factory pattern for AI model management and selection
- `services/gemini.ts` - Gemini 2.5 Flash API integration (premium tier)
- `services/sora.ts` - Sora Image API integration (creative tier) 
- `services/chatgpt.ts` - ChatGPT Vision API integration (standard tier)
- `services/promptTemplate.ts` - E-commerce optimized prompt templates for different processing types

**API Structure:**
- `routes/upload.ts` - Image upload with project creation
- `routes/session.ts` - Session management for multi-round editing
- `routes/edit.ts` - AI processing job creation and async processing
- `routes/job.ts` - Job status polling and SSE progress streams
- `routes/image.ts` - Image retrieval and export functionality

**Database Schema:** 5-table design (projects, sessions, images, jobs, variants) with UUID primary keys and JSONB context storage for editing history.

**File Storage:** Local file system with automatic cleanup, organized as uploads/ → results/ → thumbnails/ → exports/ (24h TTL).

### Frontend Architecture (`frontend/`)

**State Management:** Zustand store (`stores/appStore.ts`) manages global application state including current image, session, job status, and processing state.

**Key Components:**
- `components/ImageUpload.tsx` - Drag-and-drop upload with react-dropzone
- `components/ImageEditor.tsx` - Main editing interface with AI model selection and processing controls
- `components/ModelSelector.tsx` - AI model selection interface with capability indicators
- `components/VariantGallery.tsx` - Display AI-generated variants with integrated download functionality
- `components/DownloadModal.tsx` - Advanced export modal with format and resolution selection
- `components/ProcessingProgress.tsx` - Real-time job progress with SSE

**API Integration:** `services/api.ts` provides typed API client with axios for all backend communication.

### AI Processing Pipeline

**Multi-Model Architecture:** The system supports three AI models with different capabilities and optimization levels:

1. **Gemini 2.5 Flash** (Premium Tier) - 顶级AI图像处理模型
   - Highest processing capability and quality output
   - Professional product photography optimization
   - Advanced background processing and detail enhancement
   - Best for: 专业产品摄影, 高端图像处理, 商业级修图, 品牌宣传图

2. **Sora Image** (Creative Tier) - 高级创意AI模型
   - Creative artistic processing and visual innovation
   - Style transformation and artistic filters
   - Unique visual effects while maintaining product integrity
   - Best for: 艺术创作, 创意设计, 风格实验, 视觉艺术

3. **ChatGPT Vision** (Standard Tier) - 基础图像处理模型
   - Standard image editing and basic optimization
   - Daily use image processing with natural appearance
   - Reliable baseline quality for routine tasks
   - Best for: 日常编辑, 基础优化, 简单修图, 入门级处理

**Model Selection Logic:** Factory pattern with intelligent recommendations based on task type and capability hierarchy (Gemini > Sora > ChatGPT).

**Processing Optimization:** Each service generates single high-quality images with professional system prompts to ensure consistent proportions, perspectives, and commercial-grade results.

**Job Processing:** Async processing with database job tracking, single variant generation per request, automatic thumbnail generation.

### Environment Configuration

**Required Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection for caching/sessions  
- `GOOGLE_API_KEY` - Unified API key for AI processing (used by all models)
- `GEMINI_API_URL` - API endpoint URL (default: https://api.laozhang.ai/v1/chat/completions)
- `GEMINI_MODEL` - Gemini model name (default: gemini-2.5-flash-image-preview)
- `SORA_MODEL` - Sora model name (default: sora_image)
- `CHATGPT_MODEL` - ChatGPT model name (default: gpt-4o-image-vip)
- `RUN_MIGRATIONS` - Set to 'true' to run database migrations on startup

**File Storage Paths:** All paths relative to `../storage/` from backend directory.

### Multi-Round Editing Context

Sessions maintain editing context in `context_json` JSONB field. Each refinement operation updates session context with previous edit history, allowing AI to maintain consistency across multiple enhancement rounds.

### User Experience Features

**Intelligent Model Selection:** Users can choose from three AI models with clear capability indicators and task-specific recommendations. The system provides automatic fallbacks and intelligent suggestions based on processing requirements.

**Streamlined Download Process:** Direct download functionality integrated into image previews with comprehensive export modal supporting multiple formats (JPG, PNG, WebP) and resolution options (原始尺寸, 1920x1920, 1080x1080, 512x512).

**Real-time Processing Feedback:** SSE-based progress tracking with detailed status updates and error handling throughout the AI processing pipeline.

### Development Notes

**Local Development:** Frontend proxies `/api` requests to backend at localhost:3001. Static file serving handled by Express at `/static` route.

**Database Migrations:** SQL files in `backend/migrations/` are executed in order by `database.ts` service when `RUN_MIGRATIONS=true`.

**File Cleanup:** Automatic cleanup job runs hourly to remove expired export files (24h TTL).