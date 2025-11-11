import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../src/server';
import { getSequelize, closeDatabase } from '../../src/database/config';
import { User } from '../../src/domains/users/User';
import { Ingredient } from '../../src/domains/ingredients/Ingredient';
import { Event as EventModel } from '../../src/domains/events/Event';
import { generateToken } from '../../src/utils/jwt';

describe('Admin Routes', () => {
  let app: Application;

  // Helper function to create a user and return their token
  const createUserWithToken = async (isAdmin: boolean): Promise<{ user: User; token: string }> => {
    const user = await User.create({
      username: isAdmin ? 'admin' : 'regularuser',
      email: isAdmin ? 'admin@example.com' : 'regular@example.com',
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
    await User.destroy({ where: {} });
    await Ingredient.destroy({ where: {} });
    await EventModel.destroy({ where: {} });
  });

  describe('GET /api/admin/users', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/admin/users');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin privileges', async () => {
      const { token } = await createUserWithToken(false);
      const response = await request(app)
        .get('/api/admin/users')
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should return all users with their admin status', async () => {
      const { token } = await createUserWithToken(true);

      await User.create({
        username: 'user1',
        email: 'user1@example.com',
        password: 'hashedpassword',
        isAdmin: false,
      });

      await User.create({
        username: 'user2',
        email: 'user2@example.com',
        password: 'hashedpassword',
        isAdmin: true,
      });

      const response = await request(app)
        .get('/api/admin/users')
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            username: 'admin',
            email: 'admin@example.com',
            isAdmin: true,
          }),
          expect.objectContaining({
            id: expect.any(Number),
            username: 'user1',
            email: 'user1@example.com',
            isAdmin: false,
          }),
          expect.objectContaining({
            id: expect.any(Number),
            username: 'user2',
            email: 'user2@example.com',
            isAdmin: true,
          }),
        ])
      );
      // Should not include password
      expect(response.body[0]).not.toHaveProperty('password');
    });
  });

  describe('PATCH /api/admin/users/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .patch('/api/admin/users/1')
        .send({ isAdmin: true });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin privileges', async () => {
      const { token } = await createUserWithToken(false);
      const response = await request(app)
        .patch('/api/admin/users/1')
        .set('Cookie', [`token=${token}`])
        .send({ isAdmin: true });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should grant admin privileges to a user', async () => {
      const { token } = await createUserWithToken(true);

      const user = await User.create({
        username: 'user1',
        email: 'user1@example.com',
        password: 'hashedpassword',
        isAdmin: false,
      });

      const response = await request(app)
        .patch(`/api/admin/users/${user.id}`)
        .set('Cookie', [`token=${token}`])
        .send({ isAdmin: true });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: user.id,
        username: 'user1',
        email: 'user1@example.com',
        isAdmin: true,
      });
      expect(response.body).not.toHaveProperty('password');

      // Verify in database
      const updatedUser = await User.findByPk(user.id);
      expect(updatedUser?.isAdmin).toBe(true);
    });

    it('should revoke admin privileges from a user', async () => {
      const { token } = await createUserWithToken(true);

      const user = await User.create({
        username: 'user1',
        email: 'user1@example.com',
        password: 'hashedpassword',
        isAdmin: true,
      });

      const response = await request(app)
        .patch(`/api/admin/users/${user.id}`)
        .set('Cookie', [`token=${token}`])
        .send({ isAdmin: false });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: user.id,
        username: 'user1',
        email: 'user1@example.com',
        isAdmin: false,
      });

      // Verify in database
      const updatedUser = await User.findByPk(user.id);
      expect(updatedUser?.isAdmin).toBe(false);
    });

    it('should return 404 if user is not found', async () => {
      const { token } = await createUserWithToken(true);

      const response = await request(app)
        .patch('/api/admin/users/999')
        .set('Cookie', [`token=${token}`])
        .send({ isAdmin: false });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('should validate isAdmin field is boolean', async () => {
      const { token } = await createUserWithToken(true);

      const user = await User.create({
        username: 'user1',
        email: 'user1@example.com',
        password: 'hashedpassword',
        isAdmin: false,
      });

      const response = await request(app)
        .patch(`/api/admin/users/${user.id}`)
        .set('Cookie', [`token=${token}`])
        .send({ isAdmin: 'not-a-boolean' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('isAdmin must be a boolean');
    });

    it('should require isAdmin field in request body', async () => {
      const { token } = await createUserWithToken(true);

      const user = await User.create({
        username: 'user1',
        email: 'user1@example.com',
        password: 'hashedpassword',
        isAdmin: false,
      });

      const response = await request(app)
        .patch(`/api/admin/users/${user.id}`)
        .set('Cookie', [`token=${token}`])
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('isAdmin field is required');
    });
  });

  describe('GET /api/admin/ingredients', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/admin/ingredients');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin privileges', async () => {
      const { token } = await createUserWithToken(false);

      const response = await request(app)
        .get('/api/admin/ingredients')
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should return an empty array if no ingredients exist', async () => {
      const { token } = await createUserWithToken(true);

      const response = await request(app)
        .get('/api/admin/ingredients')
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all ingredients', async () => {
      const { token } = await createUserWithToken(true);

      await Ingredient.create({ name: 'Pepperoni' });
      await Ingredient.create({ name: 'Mushrooms' });
      await Ingredient.create({ name: 'Olives' });

      const response = await request(app)
        .get('/api/admin/ingredients')
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            name: 'Pepperoni',
          }),
          expect.objectContaining({
            id: expect.any(Number),
            name: 'Mushrooms',
          }),
          expect.objectContaining({
            id: expect.any(Number),
            name: 'Olives',
          }),
        ])
      );
    });
  });

  describe('POST /api/admin/ingredients', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/admin/ingredients')
        .send({ name: 'Pepperoni' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin privileges', async () => {
      const { token } = await createUserWithToken(false);

      const response = await request(app)
        .post('/api/admin/ingredients')
        .set('Cookie', [`token=${token}`])
        .send({ name: 'Pepperoni' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should create a new ingredient', async () => {
      const { token } = await createUserWithToken(true);

      const response = await request(app)
        .post('/api/admin/ingredients')
        .set('Cookie', [`token=${token}`])
        .send({ name: 'Pepperoni' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(Number),
        name: 'Pepperoni',
      });

      // Verify in database
      const ingredient = await Ingredient.findByPk(response.body.id);
      expect(ingredient).toBeDefined();
      expect(ingredient?.name).toBe('Pepperoni');
    });

    it('should reject duplicate ingredient name', async () => {
      const { token } = await createUserWithToken(true);

      await Ingredient.create({ name: 'Mushrooms' });

      const response = await request(app)
        .post('/api/admin/ingredients')
        .set('Cookie', [`token=${token}`])
        .send({ name: 'Mushrooms' });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Ingredient already exists');
    });

    it('should require name field', async () => {
      const { token } = await createUserWithToken(true);

      const response = await request(app)
        .post('/api/admin/ingredients')
        .set('Cookie', [`token=${token}`])
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Name is required');
    });

    it('should reject empty name', async () => {
      const { token } = await createUserWithToken(true);

      const response = await request(app)
        .post('/api/admin/ingredients')
        .set('Cookie', [`token=${token}`])
        .send({ name: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Name cannot be empty');
    });

    it('should reject name exceeding max length', async () => {
      const { token } = await createUserWithToken(true);

      const longName = 'a'.repeat(101);
      const response = await request(app)
        .post('/api/admin/ingredients')
        .set('Cookie', [`token=${token}`])
        .send({ name: longName });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Name must be between 1 and 100 characters');
    });
  });

  describe('DELETE /api/admin/ingredients/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app).delete('/api/admin/ingredients/1');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin privileges', async () => {
      const { token } = await createUserWithToken(false);

      const response = await request(app)
        .delete('/api/admin/ingredients/1')
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should delete an ingredient', async () => {
      const { token } = await createUserWithToken(true);
      const ingredient = await Ingredient.create({ name: 'Pepperoni' });

      const response = await request(app)
        .delete(`/api/admin/ingredients/${ingredient.id}`)
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});

      // Verify deleted from database
      const deletedIngredient = await Ingredient.findByPk(ingredient.id);
      expect(deletedIngredient).toBeNull();
    });

    it('should return 404 if ingredient not found', async () => {
      const { token } = await createUserWithToken(true);

      const response = await request(app)
        .delete('/api/admin/ingredients/999')
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Ingredient not found');
    });
  });

  describe('GET /api/admin/events', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/admin/events');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin privileges', async () => {
      const { token } = await createUserWithToken(false);

      const response = await request(app)
        .get('/api/admin/events')
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should return an empty array if no events exist', async () => {
      const { token } = await createUserWithToken(true);

      const response = await request(app)
        .get('/api/admin/events')
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all events', async () => {
      const { token } = await createUserWithToken(true);

      await EventModel.create({
        name: 'Pizza Friday',
        date: new Date('2025-11-15'),
        location: 'Office',
      });
      await EventModel.create({
        name: 'Pizza Monday',
        date: new Date('2025-11-18'),
        location: 'Remote',
      });

      const response = await request(app)
        .get('/api/admin/events')
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            name: 'Pizza Friday',
            location: 'Office',
          }),
          expect.objectContaining({
            id: expect.any(Number),
            name: 'Pizza Monday',
            location: 'Remote',
          }),
        ])
      );
    });
  });

  describe('POST /api/admin/events', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/admin/events')
        .send({ name: 'Pizza Friday', date: '2025-11-15', location: 'Office' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin privileges', async () => {
      const { token } = await createUserWithToken(false);

      const response = await request(app)
        .post('/api/admin/events')
        .set('Cookie', [`token=${token}`])
        .send({ name: 'Pizza Friday', date: '2025-11-15', location: 'Office' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should create a new event', async () => {
      const { token } = await createUserWithToken(true);

      const response = await request(app)
        .post('/api/admin/events')
        .set('Cookie', [`token=${token}`])
        .send({ name: 'Pizza Friday', date: '2025-11-15', location: 'Office' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(Number),
        name: 'Pizza Friday',
        location: 'Office',
      });

      // Verify in database
      const event = await EventModel.findByPk(response.body.id);
      expect(event).toBeDefined();
      expect(event?.name).toBe('Pizza Friday');
    });

    it('should require name field', async () => {
      const { token } = await createUserWithToken(true);

      const response = await request(app)
        .post('/api/admin/events')
        .set('Cookie', [`token=${token}`])
        .send({ date: '2025-11-15', location: 'Office' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Name is required');
    });

    it('should require date field', async () => {
      const { token } = await createUserWithToken(true);

      const response = await request(app)
        .post('/api/admin/events')
        .set('Cookie', [`token=${token}`])
        .send({ name: 'Pizza Friday', location: 'Office' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Date is required');
    });

    it('should require location field', async () => {
      const { token } = await createUserWithToken(true);

      const response = await request(app)
        .post('/api/admin/events')
        .set('Cookie', [`token=${token}`])
        .send({ name: 'Pizza Friday', date: '2025-11-15' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Location is required');
    });

    it('should validate date format', async () => {
      const { token } = await createUserWithToken(true);

      const response = await request(app)
        .post('/api/admin/events')
        .set('Cookie', [`token=${token}`])
        .send({ name: 'Pizza Friday', date: 'invalid-date', location: 'Office' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid date format');
    });
  });

  describe('DELETE /api/admin/events/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app).delete('/api/admin/events/1');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin privileges', async () => {
      const { token } = await createUserWithToken(false);

      const response = await request(app)
        .delete('/api/admin/events/1')
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should delete an event', async () => {
      const { token } = await createUserWithToken(true);
      const event = await EventModel.create({
        name: 'Pizza Friday',
        date: new Date('2025-11-15'),
        location: 'Office',
      });

      const response = await request(app)
        .delete(`/api/admin/events/${event.id}`)
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});

      // Verify deleted from database
      const deletedEvent = await EventModel.findByPk(event.id);
      expect(deletedEvent).toBeNull();
    });

    it('should return 404 if event not found', async () => {
      const { token } = await createUserWithToken(true);

      const response = await request(app)
        .delete('/api/admin/events/999')
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Event not found');
    });
  });
});
