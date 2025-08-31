# AI E-commerce Image Editor

A powerful AI-powered image editor designed specifically for e-commerce product photos, built with Gemini 2.5 Flash.

## Features

- **One-Click Optimization**: Automatically enhance product images with white backgrounds, improved lighting, and professional styling
- **AI-Powered Background Replacement**: Use natural language prompts to change backgrounds
- **Multi-Round Editing**: Continuous editing with context memory for iterative improvements  
- **Export Options**: Multiple format and size options optimized for e-commerce platforms
- **Real-time Processing**: Live progress updates via Server-Sent Events

## Tech Stack

### Backend
- **Runtime**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Redis
- **AI Service**: Google Gemini 2.5 Flash API
- **Image Processing**: Sharp
- **Storage**: Local file system

### Frontend  
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Image Upload**: React Dropzone
- **Icons**: Lucide React

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- Redis 6+
- Google Gemini API Key

### Installation

1. **Clone and Install**
```bash
git clone <repository-url>
cd EcommerceGraphicDesigner
npm install
cd backend && npm install
cd ../frontend && npm install
```

2. **Database Setup**
```bash
# Create PostgreSQL database
createdb ecommerce_graphic_designer

# Run migrations
cd backend
cp .env.example .env
# Edit .env with your database URL and API keys
npm run migrate
```

3. **Environment Configuration**
```bash
# Backend (.env)
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://localhost:5432/ecommerce_graphic_designer
REDIS_URL=redis://localhost:6379
GOOGLE_API_KEY=your_gemini_api_key_here
RUN_MIGRATIONS=true
```

4. **Start Development Servers**
```bash
# From project root
npm run dev
# This starts both backend (port 3001) and frontend (port 3000)
```

## API Documentation

### Core Endpoints

- `POST /api/upload` - Upload product image
- `POST /api/session` - Create editing session  
- `POST /api/edit` - Start AI enhancement job
- `GET /api/job/{id}` - Get job status
- `GET /api/job/stream/{id}` - SSE progress stream
- `POST /api/edit/refine` - Refine existing variant
- `POST /api/image/{id}/export` - Export with custom dimensions

### Example Usage

```javascript
// Upload image
const formData = new FormData();
formData.append('image', file);
const uploadResult = await fetch('/api/upload', {
  method: 'POST', 
  body: formData
});

// Start optimization
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

## Deployment

### Docker Deployment (Recommended)

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Run migrations
docker-compose exec backend npm run migrate
```

### Manual Deployment

1. **Build Applications**
```bash
npm run build
```

2. **Start Production Server**
```bash
cd backend
npm start
```

3. **Serve Frontend** (nginx example)
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

## Development

### Project Structure
```
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── models/         # Database models  
│   │   ├── services/       # Business logic
│   │   ├── routes/         # API routes
│   │   └── utils/          # Helper functions
│   └── migrations/         # Database migrations
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API clients
│   │   ├── stores/         # Zustand stores
│   │   └── types/          # TypeScript types
└── storage/                # Local file storage
    ├── uploads/            # Original images
    ├── results/            # AI processed images  
    ├── thumbnails/         # Image previews
    └── exports/            # Download files (24h TTL)
```

### Key Features Implementation

**AI Image Processing Flow:**
1. Upload → Create Project & Session
2. Submit Edit Job → Queue with Gemini API
3. Process → Generate multiple variants with scores
4. Return → Display ranked results with thumbnails
5. Export → Custom dimensions for platforms

**Multi-Round Editing:**
- Session context preserves edit history
- Each refinement builds on previous results  
- Maintains visual consistency across iterations

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)  
5. Open Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.