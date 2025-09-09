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

## 🚀 Quick Start Recommendation

**For the best development and user experience, use Scenario Mode:**
1. Start the application: `pnpm run dev`
2. Navigate to http://localhost:3001
3. Click "场景模式" (Scenario Mode) in the top navigation
4. Upload an image and explore pre-configured processing scenarios
5. Experience one-click professional image enhancement

Scenario Mode provides the most streamlined user experience with intelligent AI model selection and pre-optimized processing workflows.

## Development Commands
```bash
# Start both backend and frontend in development mode
pnpm run dev

# Start individual services
pnpm run dev:backend    # Backend only (port 3005)
pnpm run dev:frontend   # Frontend only (port 3000)
```

### Database Operations
```bash
# Run database migrations (requires RUN_MIGRATIONS=true in .env)
cd backend
pnpm run dev  # Migrations run automatically on server start

# Note: New migration 002_enhance_jobs_table.sql adds enhanced job tracking
# Note: Migration 003_api_configurations.sql adds API configuration management
# Note: Migration 004_fix_jobs_table_consistency.sql fixes PostgreSQL type consistency issues
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

# Type Generation (Frontend)
cd frontend && pnpm run types:generate  # Generate API types from OpenAPI spec
cd frontend && pnpm run types:watch     # Watch for OpenAPI changes
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
This is a production-ready, full-stack AI-powered e-commerce image editor with multi-model AI support (Gemini, Sora, ChatGPT). The application features three distinct modes: **Scenario Mode** (recommended), Traditional Image Editing, and Text-to-Image Generation. All modes process product images through AI enhancement with real-time progress tracking, intelligent model selection, and comprehensive error handling.

**Primary Flow**: Image Upload → Security Validation → Project/Session Creation → **Scenario Selection** → Feature Execution → AI Model Selection → Processing Job → Single High-Quality Variant → Automatic Display

### Key Modes

**🎯 Scenario Mode (Primary):**
- Pre-configured processing scenarios (E-commerce Products, Artistic Creation, Professional Photography)
- One-click feature execution with intelligent prompts
- Automatic model selection based on task requirements
- Simplified user experience with guided workflows

**🖼️ Traditional Editing Mode:**
- Free-form image editing with custom prompts
- Manual model selection and parameter control
- Multi-round editing with context preservation
- Advanced user control for specific requirements

**🎨 Text-to-Image Mode:**
- Generate product images from text descriptions
- Multiple style and size options
- Professional templates for e-commerce use cases

### Backend Architecture (`backend/`)

**Core Services:**
- `services/database.ts` - PostgreSQL connection and migration runner
- `services/fileStorage.ts` - Enhanced file system management with EXIF stripping, security validation, and automatic resizing
- `services/aiService.ts` - Abstract base class for unified AI service interface
- `services/aiServiceFactory.ts` - Factory pattern with capability matrix, intelligent fallback, and retry logic
- `services/gemini.ts` - Gemini 2.5 Flash API integration (premium tier)
- `services/sora.ts` - Sora Image API integration (creative tier) 
- `services/chatgpt.ts` - ChatGPT Vision API integration (standard tier)
- `services/promptTemplate.ts` - E-commerce optimized prompt templates for different processing types
- `services/apiConfigService.ts` - API configuration management with encrypted key storage and connection testing

**API Structure:**
- `routes/upload.ts` - Enhanced image upload with security validation and EXIF cleaning
- `routes/session.ts` - Session management for multi-round editing
- `routes/edit.ts` - Traditional AI processing job creation with idempotency support and async processing
- `routes/featureEdit.ts` - **NEW: Scenario-based feature execution with enhanced processing pipeline**
- `routes/scenarios.ts` - **NEW: Scenario and feature management API**
- `routes/generate.ts` - **NEW: Text-to-image generation service**
- `routes/job.ts` - Enhanced job status polling and SSE progress streams with reconnection support
- `routes/image.ts` - Image retrieval and export functionality
- `routes/config.ts` - API configuration management with encrypted key storage and testing

**Middleware & Utilities:**
- `middleware/errorHandler.ts` - Comprehensive error handling with user-friendly messages
- `middleware/rateLimiter.ts` - Request rate limiting and abuse protection
- `utils/errorSystem.ts` - Standardized error codes and multi-language support
- `utils/apiKeyEncryption.ts` - Secure API key encryption/decryption utilities

**Database Schema:** Enhanced 7-table design (projects, sessions, images, jobs, variants, api_configurations, **scenarios, features, scenario_features**) with:
- UUID primary keys and JSONB context storage
- Advanced job tracking: attempts, last_error, model_used, started_at, queued_at
- Status machine: pending → queued → running → done/error/failed
- **Scenario System**: Comprehensive scenario and feature management with metadata
- API configuration management with encrypted key storage and connection testing
- PostgreSQL type consistency with proper VARCHAR/TEXT field handling

**File Storage:** Local file system with enhanced security:
- Automatic EXIF data stripping
- Malicious file detection
- Image standardization and resizing (max 4096px)
- Organized structure: uploads/ → results/ → thumbnails/ → exports/ (24h TTL)

### Frontend Architecture (`frontend/`)

**State Management:** 
- `stores/appStore.ts` - Main application state including current image, session, job status, and processing state
- `stores/apiConfigStore.ts` - API configuration state management with encrypted key handling and connection testing

**Key Components:**
- `components/ImageUpload.tsx` - Drag-and-drop upload with react-dropzone
- `components/App.tsx` - Main application with mode switching (Scenario/Edit/Generate)
- **`components/ScenarioApp.tsx`** - **NEW: Scenario mode main application with intelligent view management**
- **`components/ScenarioSelector.tsx`** - **NEW: Interactive scenario and feature selection interface**
- **`components/ScenarioImageEditor.tsx`** - **NEW: Scenario-based image processing with simplified polling**
- `components/ImageEditor.tsx` - Traditional editing interface with AI model selection and processing controls
- `components/TextToImageGenerator.tsx` - **NEW: Text-to-image generation interface**
- `components/ModelSelector.tsx` - AI model selection interface with capability indicators
- `components/VariantGallery.tsx` - Display AI-generated variants with integrated download functionality (supports both thumb_path and image_url)
- `components/DownloadModal.tsx` - Advanced export modal with format and resolution selection
- `components/ProcessingProgress.tsx` - Real-time job progress with SSE and reconnection support
- `components/InitialSetupWizard.tsx` - First-time setup wizard for API configuration
- `components/ApiSettingsPage.tsx` - API configuration management interface
- `components/AppConfigWrapper.tsx` - Configuration state management wrapper

**API Integration:** 
- `services/api.ts` - Comprehensive typed API client with scenario support
  - `executeFeature()` - **NEW: Execute scenario-based features**
  - `getScenarios()` - **NEW: Retrieve available scenarios**  
  - `getJobVariants()` - **ENHANCED: Now returns image_url for direct display**
- `services/apiGenerated.ts` - Auto-generated API client from OpenAPI specification
- `types/api.ts` - Auto-generated TypeScript types from OpenAPI spec

### API Configuration Management

**Centralized Configuration System:**
The application features a comprehensive API configuration management system that allows users to manage multiple AI model configurations with secure key storage and connection testing.

**Key Features:**
- **Encrypted Key Storage**: All API keys are encrypted before storage using AES-256-GCM encryption
- **Multi-Configuration Support**: Users can create, manage, and switch between multiple API configurations
- **Connection Testing**: Built-in connection testing for all enabled AI models before activation
- **Initial Setup Wizard**: Guided setup process for first-time users with purchase information integration
- **Configuration Validation**: Comprehensive validation of API endpoints, model names, and key formats

**Configuration Flow:**
1. **First-Time Setup**: InitialSetupWizard guides users through API key acquisition and configuration
2. **Configuration Creation**: Users can create multiple configurations with different settings
3. **Connection Testing**: System tests connectivity to all enabled models before activation
4. **Configuration Activation**: Only validated configurations can be set as active
5. **Runtime Integration**: Active configuration dynamically provides API keys to AI services

**Security Features:**
- **Key Encryption**: API keys encrypted with rotating encryption keys
- **Masked Display**: Keys displayed in masked format (sk-...****...xyz) for security
- **No Plain Text Storage**: Keys never stored or logged in plain text
- **Secure Transmission**: All API operations use encrypted HTTPS connections


### AI Processing Pipeline

**Multi-Model Architecture with Capability Matrix:**

The system features an intelligent capability matrix that automatically selects and falls back between AI models:

1. **Gemini 2.5 Flash** (Premium Tier) - Score: 10/10
   - Highest processing capability and quality output
   - Professional product photography optimization
   - Advanced background processing and detail enhancement
   - Specializations: professional_photography, product_optimization, color_correction
   - Best for: 专业产品摄影, 高端图像处理, 商业级修图, 品牌宣传图

2. **Sora Image** (Creative Tier) - Score: 8/10
   - Creative artistic processing and visual innovation
   - Style transformation and artistic filters
   - Unique visual effects while maintaining product integrity
   - Specializations: creative_effects, artistic_transformation, style_transfer
   - Best for: 艺术创作, 创意设计, 风格实验, 视觉艺术

3. **ChatGPT Vision** (Standard Tier) - Score: 7/10
   - Standard image editing and basic optimization
   - Daily use image processing with natural appearance
   - Reliable baseline quality for routine tasks
   - Specializations: general_editing, basic_enhancement, quick_fixes
   - Best for: 日常编辑, 基础优化, 简单修图, 入门级处理

**Advanced Features:**
- **Intelligent Fallback**: Automatic model switching on failure/rate limits
- **Retry Logic**: Exponential backoff with 3-attempt maximum
- **Task-Specific Recommendations**: Optimized model selection per operation type
- **Performance Tracking**: Model usage analytics and success rates

**Job Processing:** 
- Async processing with enhanced database job tracking
- Idempotency support via idempotency-key headers
- Comprehensive retry and timeout handling
- Single high-quality variant generation per request
- Automatic thumbnail generation with quality optimization

### API Documentation

**OpenAPI 3.0 Specification:** Complete API documentation available at `/api/docs`
- Interactive Swagger UI for API exploration
- Comprehensive endpoint documentation with examples
- Error code definitions and response schemas
- Authentication and rate limiting documentation

**Auto-Generated Types:** Frontend uses automatically generated TypeScript types ensuring type safety across the entire application stack.

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
- `MAX_FILE_SIZE` - Maximum upload file size (default: 10MB)
- `MAX_IMAGE_DIMENSION` - Maximum image dimension (default: 4096px)

**File Storage Paths:** All paths relative to `../storage/` from backend directory.

### Enhanced Error Handling

**Standardized Error System:**
- 40+ standardized error codes covering all failure scenarios
- Multi-language user-friendly error messages (Chinese/English)
- Structured error logging with request context
- Retry guidance and actionable error suggestions
- Error categorization: user/system/external/temporary

**Error Categories:**
- AI Model Errors (E_AI_MODEL_UNAVAILABLE, E_AI_MODEL_RATE_LIMITED)
- Input Validation (E_INPUT_TOO_LARGE, E_INVALID_FILE_TYPE)
- Processing Errors (E_PROCESSING_FAILED, E_PROCESSING_TIMEOUT)
- Resource Errors (E_SESSION_NOT_FOUND, E_IMAGE_NOT_FOUND)
- System Errors (E_INTERNAL_ERROR, E_DATABASE_ERROR)

### Multi-Round Editing Context

Sessions maintain comprehensive editing context in `context_json` JSONB field:
- Previous edit history with timestamps
- Model usage tracking
- Processing parameters and results
- User preference learning

Each refinement operation updates session context, allowing AI to maintain consistency across multiple enhancement rounds.

### User Experience Features

**Intelligent Model Selection:** 
- Capability-based automatic model selection
- User preference learning and recommendation
- Real-time availability checking
- Transparent fallback notifications

**Streamlined Download Process:** 
- Direct download functionality integrated into image previews
- Comprehensive export modal with multiple format support (JPG, PNG, WebP)
- Resolution options: 原始尺寸, 1920x1920, 1080x1080, 512x512
- 24-hour download link expiration with cleanup

**Real-time Processing Feedback:** 
- **UPDATED: Simplified polling mechanism for Chrome localhost environments**
- **Smart detection**: Auto-detects Chrome localhost and switches to reliable polling
- **Hybrid approach**: SSE for compatible environments, polling for problematic ones
- Detailed status updates including model usage and retry attempts
- Error handling with user-friendly suggestions
- **Automatic result display**: No manual refresh buttons needed - results appear automatically

### Security Features

**Upload Security:**
- MIME type validation with extension verification
- Malicious file pattern detection
- EXIF data stripping for privacy protection
- Automatic image standardization and size limits
- Path traversal protection

**API Security:**
- Rate limiting with configurable thresholds
- Request validation and sanitization
- Structured error responses without sensitive data exposure
- CORS configuration for development and production

### Development Notes

**Local Development:** 
- Frontend proxies `/api` requests to backend at localhost:3005
- Static file serving handled by Express at `/static` route
- Hot reloading for both frontend and backend
- TypeScript compilation with balanced strict mode

**Database Migrations:** 
- SQL files in `backend/migrations/` executed in order
- Migration 001: Initial schema with 5-table design
- Migration 002: Enhanced job tracking with retry mechanism
- Migration 003: API configuration management with encrypted key storage
- Migration 004: PostgreSQL type consistency fixes for job status updates
- Migration 005: **NEW: Text-to-image generation support**
- Migration 006: **NEW: Scenario system architecture** 
- Migration 007: **NEW: Initialize scenario data with pre-configured scenarios**
- Automatic migration execution when `RUN_MIGRATIONS=true`

**File Cleanup:** 
- Automatic cleanup job runs hourly
- Exported files expire after 24 hours
- Storage path organization for efficient cleanup
- Configurable retention policies

**TypeScript Configuration:**
- Balanced strict mode for development efficiency
- Auto-generated types from OpenAPI specification
- Type safety across frontend-backend boundary
- Development-friendly error handling

**Common Development Issues & Solutions:**

**Scenario Mode Result Display:**
- Issue: Generated images not displaying after processing completion
- Root Cause: Field name mismatch - backend sends `result_variants`, frontend looks for `variants`
- **Solution**: Updated ScenarioImageEditor to use `result_variants` field consistently
- **Fixed**: Implemented simplified polling mechanism like ImageEditor for reliability

**Frontend UI Styling (Scenario Mode):**
- Issue: Feature buttons appearing white/invisible on dark background
- Root Cause: CSS conflicts between `bg-gray-50` and dark theme
- **Solution**: Updated compact feature buttons to use `bg-white/10` with proper contrast
- **Fixed**: All scenario buttons now have proper visibility and hover effects

**PostgreSQL Type Consistency:**
- Issue: `inconsistent types deduced for parameter` errors in job status updates
- Solution: Migration 004 ensures proper VARCHAR/TEXT type handling
- Prevention: Always validate SQL parameter types match database schema

**String Escape Issues:**
- Issue: `Expecting Unicode escape sequence \uXXXX` in React components
- Solution: Replace `\"` with `"` in JSX string attributes
- Prevention: Use consistent quote escaping in template literals

**API Configuration Issues:**
- Issue: Initial setup fails with UUID format errors
- Solution: Ensure proper UUID format in database queries
- Prevention: Validate UUIDs before database operations

**Data Type Compatibility:**
- Issue: VariantGallery expects both `thumb_path` and `image_url` fields
- **Solution**: Enhanced VariantModel.findByJobId to JOIN with images table and provide image_url
- **Result**: Unified data structure supporting both legacy and new display patterns

**Development Workflow:**
1. Run `pnpm run install:all` after git pull
2. Check `.env` file exists and has required variables
3. Start backend first: `pnpm run dev:backend`
4. Start frontend: `pnpm run dev:frontend`
5. Access application at http://localhost:3001 (frontend) with backend at http://localhost:3005
6. **Recommended**: Use Scenario Mode for best user experience and testing

### Production Readiness

**Monitoring & Observability:**
- Structured logging with request correlation IDs
- Error tracking with stack traces and context
- Performance metrics collection points
- Health check endpoints for load balancers

**Scalability Features:**
- Async job processing architecture
- Database connection pooling
- File storage with cleanup automation
- Configurable rate limiting and concurrency controls

**Reliability Features:**
- Comprehensive retry mechanisms
- Circuit breaker patterns for external services
- Graceful degradation on service failures
- Data consistency guarantees with ACID transactions