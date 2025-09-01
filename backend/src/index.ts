import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import { db } from './services/database';
import { fileStorage } from './services/fileStorage';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

import uploadRoutes from './routes/upload';
import sessionRoutes from './routes/session';
import jobRoutes from './routes/job';
import imageRoutes from './routes/image';
import editRoutes from './routes/edit';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'development' 
    ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'] 
    : process.env.ALLOWED_ORIGINS?.split(',') || [],
  credentials: true
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(rateLimiter);

app.use('/static', express.static(path.resolve('../storage'), {
  maxAge: '1d',
  etag: true
}));

app.use('/api/upload', uploadRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/job', jobRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/edit', editRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

async function startServer() {
  try {
    await fileStorage.init();
    console.log('File storage initialized');
    
    if (process.env.RUN_MIGRATIONS === 'true') {
      await db.runMigrations();
      console.log('Database migrations completed');
    }
    
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });

    const gracefulShutdown = async () => {
      console.log('Received shutdown signal, closing server gracefully...');
      server.close(async () => {
        await db.close();
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    setInterval(async () => {
      await fileStorage.cleanupExpiredFiles('exports', 24);
    }, 60 * 60 * 1000);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export default app;