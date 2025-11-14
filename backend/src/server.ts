import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import eventsRoutes from './routes/events';
import { setupAssociations } from './database/associations';

// Set up model associations
setupAssociations();

export const createApp = (): Express => {
  const app = express();

  // CORS configuration - allow both development and production origins
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://dominos-frontend-kj5n.onrender.com',
  ];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));
  app.use(express.json());
  app.use(cookieParser());

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/events', eventsRoutes);

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'dominos-backend'
    });
  });

  // Root endpoint
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      message: 'Domino\'s Pizza Toppings API',
      version: '1.0.0'
    });
  });

  return app;
};
