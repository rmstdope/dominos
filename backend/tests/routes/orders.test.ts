import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../src/server';
import { getSequelize, closeDatabase } from '../../src/database/config';
import { Event as EventModel } from '../../src/domains/events/Event';
import { User } from '../../src/domains/users/User';
import { Ingredient } from '../../src/domains/ingredients/Ingredient';
import { Order } from '../../src/domains/orders/Order';
import { OrderIngredient } from '../../src/domains/orders/OrderIngredient';
import { hashPassword } from '../../src/utils/password';
import { generateToken } from '../../src/utils/jwt';

describe('Order Routes', () => {
  let app: Application;
  let authToken: string;
  let userId: number;
  let eventId: number;
  let ingredientIds: number[];

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
    // Clean up in correct order
    await OrderIngredient.destroy({ where: {}, truncate: true, cascade: true });
    await Order.destroy({ where: {}, truncate: true, cascade: true });
    await EventModel.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });
    await Ingredient.destroy({ where: {}, truncate: true, cascade: true });

    // Create test user
    const hashedPassword = await hashPassword('password123');
    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      isAdmin: false,
    });
    userId = user.id;
    authToken = generateToken({ userId: user.id, username: user.username, isAdmin: user.isAdmin });

    // Create test event
    const event = await EventModel.create({
      name: 'Pizza Night',
      date: new Date('2025-12-31'),
      location: 'Office',
    });
    eventId = event.id;

    // Create test ingredients
    const ingredient1 = await Ingredient.create({ name: 'Pepperoni' });
    const ingredient2 = await Ingredient.create({ name: 'Mushrooms' });
    const ingredient3 = await Ingredient.create({ name: 'Olives' });
    ingredientIds = [ingredient1.id, ingredient2.id, ingredient3.id];
  });

  describe('POST /api/events/:eventId/orders', () => {
    it('should create an order with size and ingredients', async () => {
      const response = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Cookie', [`token=${authToken}`])
        .send({
          size: 'Standard',
          ingredientIds: [ingredientIds[0], ingredientIds[1]],
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        message: 'Order created successfully',
        order: {
          id: expect.any(Number),
          userId,
          eventId,
          size: 'Standard',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      });
    });

    it('should create an order with Small size', async () => {
      const response = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Cookie', [`token=${authToken}`])
        .send({
          size: 'Small',
          ingredientIds: [ingredientIds[0]],
        });

      expect(response.status).toBe(201);
      expect(response.body.order.size).toBe('Small');
    });

    it('should create an order with no ingredients (empty array)', async () => {
      const response = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Cookie', [`token=${authToken}`])
        .send({
          size: 'Standard',
          ingredientIds: [],
        });

      expect(response.status).toBe(201);
      expect(response.body.order.size).toBe('Standard');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .send({
          size: 'Standard',
          ingredientIds: [ingredientIds[0]],
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .post('/api/events/99999/orders')
        .set('Cookie', [`token=${authToken}`])
        .send({
          size: 'Standard',
          ingredientIds: [ingredientIds[0]],
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Event not found');
    });

    it('should return 400 if size is missing', async () => {
      const response = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Cookie', [`token=${authToken}`])
        .send({
          ingredientIds: [ingredientIds[0]],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('size');
    });

    it('should return 400 if size is invalid', async () => {
      const response = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Cookie', [`token=${authToken}`])
        .send({
          size: 'Extra Large',
          ingredientIds: [ingredientIds[0]],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('size');
    });

    it('should return 400 if ingredientIds is not an array', async () => {
      const response = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Cookie', [`token=${authToken}`])
        .send({
          size: 'Standard',
          ingredientIds: 'not-an-array',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('ingredientIds');
    });

    it('should return 400 if ingredient IDs contain invalid values', async () => {
      const response = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Cookie', [`token=${authToken}`])
        .send({
          size: 'Standard',
          ingredientIds: [ingredientIds[0], 'invalid', ingredientIds[1]],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('ingredient');
    });

    it('should return 409 if user already has an order for this event', async () => {
      // Create first order
      await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Cookie', [`token=${authToken}`])
        .send({
          size: 'Standard',
          ingredientIds: [ingredientIds[0]],
        });

      // Attempt to create second order
      const response = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Cookie', [`token=${authToken}`])
        .send({
          size: 'Small',
          ingredientIds: [ingredientIds[1]],
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already');
    });

    it('should store ingredients correctly in order_ingredients table', async () => {
      const response = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Cookie', [`token=${authToken}`])
        .send({
          size: 'Standard',
          ingredientIds: [ingredientIds[0], ingredientIds[2]],
        });

      expect(response.status).toBe(201);

      const orderId = response.body.order.id;
      const orderIngredients = await OrderIngredient.findAll({
        where: { orderId },
      });

      expect(orderIngredients).toHaveLength(2);
      expect(orderIngredients.map((oi) => oi.ingredientId).sort()).toEqual(
        [ingredientIds[0], ingredientIds[2]].sort()
      );
    });
  });

  describe('GET /api/events/:eventId/orders/my-order', () => {
    it('should return the user\'s order for an event', async () => {
      // Create order first
      await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Cookie', [`token=${authToken}`])
        .send({
          size: 'Standard',
          ingredientIds: [ingredientIds[0], ingredientIds[1]],
        });

      const response = await request(app)
        .get(`/api/events/${eventId}/orders/my-order`)
        .set('Cookie', [`token=${authToken}`]);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        order: {
          id: expect.any(Number),
          userId,
          eventId,
          size: 'Standard',
          ingredientIds: expect.arrayContaining([ingredientIds[0], ingredientIds[1]]),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      });
    });

    it('should return 404 if user has no order for the event', async () => {
      const response = await request(app)
        .get(`/api/events/${eventId}/orders/my-order`)
        .set('Cookie', [`token=${authToken}`]);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No order found for this event');
    });

    it('should require authentication', async () => {
      const response = await request(app).get(`/api/events/${eventId}/orders/my-order`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .get('/api/events/99999/orders/my-order')
        .set('Cookie', [`token=${authToken}`]);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Event not found');
    });

    it('should include all ingredient IDs in the response', async () => {
      // Create order with all ingredients
      await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Cookie', [`token=${authToken}`])
        .send({
          size: 'Small',
          ingredientIds: ingredientIds,
        });

      const response = await request(app)
        .get(`/api/events/${eventId}/orders/my-order`)
        .set('Cookie', [`token=${authToken}`]);

      expect(response.status).toBe(200);
      expect(response.body.order.ingredientIds).toHaveLength(3);
      expect(response.body.order.ingredientIds.sort()).toEqual(ingredientIds.sort());
    });
  });
});
