import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../src/server';

describe('Server Health Check', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  describe('GET /health', () => {
    it('should return 200 and health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('service', 'dominos-backend');
    });

    it('should return a valid ISO timestamp', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });

  describe('GET /', () => {
    it('should return 200 and API info', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('version', '1.0.0');
    });

    it('should return JSON content type', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('404 Not Found', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');

      expect(response.status).toBe(404);
    });
  });
});
