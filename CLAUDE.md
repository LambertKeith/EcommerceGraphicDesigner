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
This is a full-stack AI-powered e-commerce image editor built around Google Gemini 2.5 Flash API. The application processes product images through AI enhancement with real-time progress tracking.

**Flow**: Image Upload → Project/Session Creation → AI Processing Job → Multiple Variants Generation → Export

### Backend Architecture (`backend/`)

**Core Services:**
- `services/database.ts` - PostgreSQL connection and migration runner
- `services/fileStorage.ts` - Local file system management (uploads, results, thumbnails, exports) 
- `services/gemini.ts` - Gemini 2.5 Flash Image API integration for direct image processing
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
- `components/ImageEditor.tsx` - Main editing interface with AI processing controls
- `components/VariantGallery.tsx` - Display AI-generated variants with scoring
- `components/ProcessingProgress.tsx` - Real-time job progress with SSE

**API Integration:** `services/api.ts` provides typed API client with axios for all backend communication.

### AI Processing Pipeline

**Gemini Integration:** The `gemini.ts` service wraps Google's Generative AI with three enhancement levels:
1. **Basic Enhancement** - 1080x1080, white background, basic adjustments
2. **Advanced Enhancement** - 1500x1500, enhanced color/sharpening, gamma correction  
3. **Minimal Enhancement** - Conservative adjustments, smaller file size

**Job Processing:** Async processing with database job tracking, generates 2-3 scored variants per request, automatic thumbnail generation.

### Environment Configuration

**Required Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection for caching/sessions  
- `GOOGLE_API_KEY` - Gemini API key for AI processing
- `GEMINI_API_URL` - Gemini API endpoint URL (default: https://api.laozhang.ai/v1/chat/completions)
- `GEMINI_MODEL` - Gemini model name (default: gemini-2.5-flash-image-preview)
- `RUN_MIGRATIONS` - Set to 'true' to run database migrations on startup

**File Storage Paths:** All paths relative to `../storage/` from backend directory.

### Multi-Round Editing Context

Sessions maintain editing context in `context_json` JSONB field. Each refinement operation updates session context with previous edit history, allowing AI to maintain consistency across multiple enhancement rounds.

### Development Notes

**Local Development:** Frontend proxies `/api` requests to backend at localhost:3001. Static file serving handled by Express at `/static` route.

**Database Migrations:** SQL files in `backend/migrations/` are executed in order by `database.ts` service when `RUN_MIGRATIONS=true`.

**File Cleanup:** Automatic cleanup job runs hourly to remove expired export files (24h TTL).