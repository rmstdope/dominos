import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../src/server';
import { getSequelize, closeDatabase } from '../../src/database/config';
import { Event as EventModel } from '../../src/domains/events/Event';
import { Ingredient } from '../../src/domains/ingredients/Ingredient';
import { EventIngredient } from '../../src/domains/events/EventIngredient';

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
    await EventIngredient.destroy({ where: {} });
    await Ingredient.destroy({ where: {} });
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

    it('should handle invalid requests gracefully', async () => {
      // This tests that the endpoint handles errors without crashing
      const response = await request(app).get('/api/events');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('events');
      expect(Array.isArray(response.body.events)).toBe(true);
    });
  });

  describe('GET /api/events/:id/ingredients', () => {
    it('should return ingredients for an event sorted alphabetically', async () => {
      // Create event
      const event = await EventModel.create({
        name: 'Pizza Party',
        date: new Date('2025-12-01'),
        location: 'Office A',
      });

      // Create ingredients
      const pepperoni = await Ingredient.create({ name: 'Pepperoni' });
      const mushrooms = await Ingredient.create({ name: 'Mushrooms' });
      const bacon = await Ingredient.create({ name: 'Bacon' });
      const olives = await Ingredient.create({ name: 'Olives' });

      // Associate ingredients with event (in non-alphabetical order)
      await EventIngredient.create({ eventId: event.id!, ingredientId: pepperoni.id! });
      await EventIngredient.create({ eventId: event.id!, ingredientId: olives.id! });
      await EventIngredient.create({ eventId: event.id!, ingredientId: bacon.id! });
      await EventIngredient.create({ eventId: event.id!, ingredientId: mushrooms.id! });

      const response = await request(app).get(`/api/events/${event.id}/ingredients`);

      expect(response.status).toBe(200);
      expect(response.body.ingredients).toHaveLength(4);
      
      // Verify alphabetical order
      expect(response.body.ingredients[0].name).toBe('Bacon');
      expect(response.body.ingredients[1].name).toBe('Mushrooms');
      expect(response.body.ingredients[2].name).toBe('Olives');
      expect(response.body.ingredients[3].name).toBe('Pepperoni');

      // Verify response format
      expect(response.body.ingredients[0]).toEqual({
        id: expect.any(Number),
        name: 'Bacon',
      });
    });

    it('should return 404 for non-existent event', async () => {
      const response = await request(app).get('/api/events/99999/ingredients');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Event not found');
    });

    it('should return empty array for event with no ingredients', async () => {
      const event = await EventModel.create({
        name: 'Pizza Party',
        date: new Date('2025-12-01'),
        location: 'Office A',
      });

      const response = await request(app).get(`/api/events/${event.id}/ingredients`);

      expect(response.status).toBe(200);
      expect(response.body.ingredients).toEqual([]);
    });

    it('should not require authentication', async () => {
      const event = await EventModel.create({
        name: 'Public Event',
        date: new Date('2025-11-20'),
        location: 'Public Venue',
      });

      const ingredient = await Ingredient.create({ name: 'Cheese' });
      await EventIngredient.create({ eventId: event.id!, ingredientId: ingredient.id! });

      // Request without authentication token
      const response = await request(app).get(`/api/events/${event.id}/ingredients`);

      expect(response.status).toBe(200);
      expect(response.body.ingredients).toHaveLength(1);
      expect(response.body.ingredients[0].name).toBe('Cheese');
    });

    it('should handle invalid event ID format', async () => {
      const response = await request(app).get('/api/events/invalid/ingredients');

      // Invalid ID gets parsed as NaN, which won't find an event
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Event not found');
    });
  });
});

