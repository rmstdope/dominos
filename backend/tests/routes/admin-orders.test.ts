import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../src/server';
import { getSequelize, closeDatabase } from '../../src/database/config';
import { User } from '../../src/domains/users/User';
import { Ingredient } from '../../src/domains/ingredients/Ingredient';
import { Event as EventModel } from '../../src/domains/events/Event';
import { Order } from '../../src/domains/orders/Order';
import { OrderIngredient } from '../../src/domains/orders/OrderIngredient';
import { generateToken } from '../../src/utils/jwt';

describe('Admin Orders Routes', () => {
  let app: Application;

  // Helper function to create a user and return their token
  const createUserWithToken = async (isAdmin: boolean, username = 'testuser'): Promise<{ user: User; token: string }> => {
    const user = await User.create({
      username,
      email: `${username}@example.com`,
      password: 'hashedpassword',
      isAdmin,
    });
    const token = generateToken({ userId: user.id, username: user.username, isAdmin: user.isAdmin });
    return { user, token };
  };

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
    await OrderIngredient.destroy({ where: {} });
    await Order.destroy({ where: {} });
    await User.destroy({ where: {} });
    await Ingredient.destroy({ where: {} });
    await EventModel.destroy({ where: {} });
  });

  describe('GET /api/admin/orders', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/admin/orders');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin privileges', async () => {
      const { token } = await createUserWithToken(false);

      const response = await request(app)
        .get('/api/admin/orders')
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should return an empty array if no orders exist', async () => {
      const { token } = await createUserWithToken(true, 'admin');

      const response = await request(app)
        .get('/api/admin/orders')
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ orders: [] });
    });

    it('should return all orders with user, event, and ingredient details', async () => {
      const { token } = await createUserWithToken(true, 'admin');
      
      // Create test data
      const user1 = await User.create({
        username: 'john',
        email: 'john@example.com',
        password: 'hashedpassword',
        isAdmin: false,
      });

      const user2 = await User.create({
        username: 'jane',
        email: 'jane@example.com',
        password: 'hashedpassword',
        isAdmin: false,
      });

      const event1 = await EventModel.create({
        name: 'Team Pizza Night',
        date: new Date('2025-11-15'),
        location: 'Office',
      });

      const event2 = await EventModel.create({
        name: 'Friday Lunch',
        date: new Date('2025-11-22'),
        location: 'Remote',
      });

      const pepperoni = await Ingredient.create({ name: 'Pepperoni' });
      const mushrooms = await Ingredient.create({ name: 'Mushrooms' });
      const olives = await Ingredient.create({ name: 'Olives' });

      // Create orders
      const order1 = await Order.create({
        userId: user1.id,
        eventId: event1.id,
        size: 'Standard',
      });

      await OrderIngredient.create({
        orderId: order1.id,
        ingredientId: pepperoni.id,
      });

      await OrderIngredient.create({
        orderId: order1.id,
        ingredientId: mushrooms.id,
      });

      const order2 = await Order.create({
        userId: user2.id,
        eventId: event2.id,
        size: 'Small',
      });

      await OrderIngredient.create({
        orderId: order2.id,
        ingredientId: olives.id,
      });

      const order3 = await Order.create({
        userId: user1.id,
        eventId: event2.id,
        size: 'Standard',
      });

      // Order with no ingredients
      // order3 has no ingredients

      const response = await request(app)
        .get('/api/admin/orders')
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(200);
      expect(response.body.orders).toHaveLength(3);
      
      // Check order 1 with multiple ingredients
      const responseOrder1 = response.body.orders.find((o: any) => o.id === order1.id);
      expect(responseOrder1).toMatchObject({
        id: order1.id,
        userId: user1.id,
        userName: 'john',
        eventId: event1.id,
        eventName: 'Team Pizza Night',
        size: 'Standard',
        ingredients: expect.arrayContaining(['Pepperoni', 'Mushrooms']),
        createdAt: expect.any(String),
      });
      expect(responseOrder1.ingredients).toHaveLength(2);

      // Check order 2 with single ingredient
      const responseOrder2 = response.body.orders.find((o: any) => o.id === order2.id);
      expect(responseOrder2).toMatchObject({
        id: order2.id,
        userId: user2.id,
        userName: 'jane',
        eventId: event2.id,
        eventName: 'Friday Lunch',
        size: 'Small',
        ingredients: ['Olives'],
        createdAt: expect.any(String),
      });

      // Check order 3 with no ingredients
      const responseOrder3 = response.body.orders.find((o: any) => o.id === order3.id);
      expect(responseOrder3).toMatchObject({
        id: order3.id,
        userId: user1.id,
        userName: 'john',
        eventId: event2.id,
        eventName: 'Friday Lunch',
        size: 'Standard',
        ingredients: [],
        createdAt: expect.any(String),
      });
    });

    it('should return orders sorted by creation date (newest first)', async () => {
      const { token } = await createUserWithToken(true, 'admin');
      
      const user = await User.create({
        username: 'john',
        email: 'john@example.com',
        password: 'hashedpassword',
        isAdmin: false,
      });

      const event1 = await EventModel.create({
        name: 'Team Pizza Night',
        date: new Date('2025-11-15'),
        location: 'Office',
      });

      const event2 = await EventModel.create({
        name: 'Friday Lunch',
        date: new Date('2025-11-22'),
        location: 'Remote',
      });

      const event3 = await EventModel.create({
        name: 'Monday Dinner',
        date: new Date('2025-11-25'),
        location: 'Office',
      });

      // Create orders with slight delays to ensure different timestamps
      await Order.create({
        userId: user.id,
        eventId: event1.id,
        size: 'Standard',
      });

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 10));

      await Order.create({
        userId: user.id,
        eventId: event2.id,
        size: 'Small',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await Order.create({
        userId: user.id,
        eventId: event3.id,
        size: 'Standard',
      });

      const response = await request(app)
        .get('/api/admin/orders')
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(200);
      expect(response.body.orders).toHaveLength(3);
      
      // Verify orders are sorted by creation date descending (newest first)
      const timestamps = response.body.orders.map((o: any) => new Date(o.createdAt).getTime());
      expect(timestamps[0]).toBeGreaterThanOrEqual(timestamps[1]);
      expect(timestamps[1]).toBeGreaterThanOrEqual(timestamps[2]);
    });
  });
});
