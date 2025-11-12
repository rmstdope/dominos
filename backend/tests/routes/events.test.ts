import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../src/server';
import { getSequelize, closeDatabase } from '../../src/database/config';
import { Event as EventModel } from '../../src/domains/events/Event';

describe('Public Events Routes', () => {
  let app: Application;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.JWT_EXPIRES_IN = '1h';

    app = createApp();
    const sequelize = getSequelize();
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await EventModel.destroy({ where: {} });
  });

  describe('GET /api/events', () => {
    it('should return all events sorted by date ascending', async () => {
      // Create events with different dates
      await EventModel.create({
        name: 'Future Event',
        date: new Date('2025-12-01'),
        location: 'Office A',
      });

      await EventModel.create({
        name: 'Past Event',
        date: new Date('2025-10-01'),
        location: 'Office B',
      });

      await EventModel.create({
        name: 'Recent Event',
        date: new Date('2025-11-15'),
        location: 'Office C',
      });

      const response = await request(app).get('/api/events');

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(3);
      
      // Verify ascending order (oldest first)
      expect(response.body.events[0].name).toBe('Past Event');
      expect(response.body.events[1].name).toBe('Recent Event');
      expect(response.body.events[2].name).toBe('Future Event');

      // Verify all required fields are present
      expect(response.body.events[0]).toEqual({
        id: expect.any(Number),
        name: 'Past Event',
        date: expect.any(String),
        location: 'Office B',
      });
    });

    it('should return empty array when no events exist', async () => {
      const response = await request(app).get('/api/events');

      expect(response.status).toBe(200);
      expect(response.body.events).toEqual([]);
    });

    it('should not require authentication', async () => {
      await EventModel.create({
        name: 'Public Event',
        date: new Date('2025-11-20'),
        location: 'Public Venue',
      });

      // Request without authentication token
      const response = await request(app).get('/api/events');

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0].name).toBe('Public Event');
    });

    it('should handle database errors gracefully', async () => {
      // Close the database to simulate an error
      await closeDatabase();

      const response = await request(app).get('/api/events');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');

      // Reconnect for cleanup
      const sequelize = getSequelize();
      await sequelize.sync({ force: true });
    });
  });
});
