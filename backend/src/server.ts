import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import eventsRoutes from './routes/events';

export const createApp = (): Express => {
  const app = express();

  // Middleware
  app.use(cors({
    origin: 'http://localhost:5173',
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
