import express, { Express, Request, Response } from 'express';
import cors from 'cors';

export const createApp = (): Express => {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

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
