import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../src/server';
import { getSequelize, closeDatabase } from '../../src/database/config';
import { User } from '../../src/domains/users/User';
import { Ingredient } from '../../src/domains/ingredients/Ingredient';
import { Event as EventModel } from '../../src/domains/events/Event';
import { EventIngredient } from '../../src/domains/events/EventIngredient';
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
    await EventIngredient.destroy({ where: {} });
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
      expect(response.body.users).toHaveLength(3);
      expect(response.body.users).toEqual(
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
      expect(response.body.users[0]).not.toHaveProperty('password');
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

  describe('POST /api/admin/users', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin privileges', async () => {
      const { token } = await createUserWithToken(false);
      const response = await request(app)
        .post('/api/admin/users')
        .set('Cookie', [`token=${token}`])
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should create a new user', async () => {
      const { token } = await createUserWithToken(true);

      const response = await request(app)
        .post('/api/admin/users')
        .set('Cookie', [`token=${token}`])
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        user: {
          id: expect.any(Number),
          username: 'newuser',
          email: 'newuser@example.com',
          isAdmin: false,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      });
      expect(response.body.user).not.toHaveProperty('password');

      // Verify in database
      const user = await User.findByPk(response.body.user.id);
      expect(user).toBeDefined();
      expect(user?.username).toBe('newuser');
      expect(user?.email).toBe('newuser@example.com');
      expect(user?.isAdmin).toBe(false);
      expect(user?.password).not.toBe('password123'); // Should be hashed
    });

    it('should require username field', async () => {
      const { token } = await createUserWithToken(true);

      const response = await request(app)
        .post('/api/admin/users')
        .set('Cookie', [`token=${token}`])
        .send({
          email: 'newuser@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });

    it('should require email field', async () => {
      const { token } = await createUserWithToken(true);

      const response = await request(app)
        .post('/api/admin/users')
        .set('Cookie', [`token=${token}`])
        .send({
          username: 'newuser',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });

    it('should require password field', async () => {
      const { token } = await createUserWithToken(true);

      const response = await request(app)
        .post('/api/admin/users')
        .set('Cookie', [`token=${token}`])
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });

    it('should reject duplicate username', async () => {
      const { token } = await createUserWithToken(true);

      await User.create({
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'hashedpassword',
        isAdmin: false,
      });

      const response = await request(app)
        .post('/api/admin/users')
        .set('Cookie', [`token=${token}`])
        .send({
          username: 'existinguser',
          email: 'newemail@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username or email already exists');
    });

    it('should reject duplicate email', async () => {
      const { token } = await createUserWithToken(true);

      await User.create({
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'hashedpassword',
        isAdmin: false,
      });

      const response = await request(app)
        .post('/api/admin/users')
        .set('Cookie', [`token=${token}`])
        .send({
          username: 'newusername',
          email: 'existing@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username or email already exists');
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
      expect(response.body).toEqual({ ingredients: [] });
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
      expect(response.body.ingredients).toHaveLength(3);
      expect(response.body.ingredients).toEqual(
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
        ingredient: {
          id: expect.any(Number),
          name: 'Pepperoni',
        }
      });

      // Verify in database
      const ingredient = await Ingredient.findByPk(response.body.ingredient.id);
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
      expect(response.body).toEqual({ events: [] });
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
      expect(response.body.events).toHaveLength(2);
      expect(response.body.events).toEqual(
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

  describe('GET /api/admin/events/:eventId/ingredients', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/admin/events/1/ingredients');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin privileges', async () => {
      const { token } = await createUserWithToken(false);

      const response = await request(app)
        .get('/api/admin/events/1/ingredients')
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should return 404 if event not found', async () => {
      const { token } = await createUserWithToken(true);

      const response = await request(app)
        .get('/api/admin/events/999/ingredients')
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Event not found');
    });

    it('should return empty array if event has no ingredients', async () => {
      const { token } = await createUserWithToken(true);

      const event = await EventModel.create({
        name: 'Pizza Friday',
        date: new Date('2025-11-15'),
        location: 'Office',
      });

      const response = await request(app)
        .get(`/api/admin/events/${event.id}/ingredients`)
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all ingredients for an event', async () => {
      const { token } = await createUserWithToken(true);

      const event = await EventModel.create({
        name: 'Pizza Friday',
        date: new Date('2025-11-15'),
        location: 'Office',
      });

      const ingredient1 = await Ingredient.create({ name: 'Pepperoni' });
      const ingredient2 = await Ingredient.create({ name: 'Mushrooms' });

      await EventIngredient.create({
        eventId: event.id,
        ingredientId: ingredient1.id,
      });

      await EventIngredient.create({
        eventId: event.id,
        ingredientId: ingredient2.id,
      });

      const response = await request(app)
        .get(`/api/admin/events/${event.id}/ingredients`)
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: ingredient1.id,
            name: 'Pepperoni',
          }),
          expect.objectContaining({
            id: ingredient2.id,
            name: 'Mushrooms',
          }),
        ])
      );
    });
  });

  describe('POST /api/admin/events/:eventId/ingredients', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/admin/events/1/ingredients')
        .send({ ingredientId: 1 });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin privileges', async () => {
      const { token } = await createUserWithToken(false);

      const response = await request(app)
        .post('/api/admin/events/1/ingredients')
        .set('Cookie', [`token=${token}`])
        .send({ ingredientId: 1 });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should return 404 if event not found', async () => {
      const { token } = await createUserWithToken(true);

      const response = await request(app)
        .post('/api/admin/events/999/ingredients')
        .set('Cookie', [`token=${token}`])
        .send({ ingredientId: 1 });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Event not found');
    });

    it('should return 404 if ingredient not found', async () => {
      const { token } = await createUserWithToken(true);

      const event = await EventModel.create({
        name: 'Pizza Friday',
        date: new Date('2025-11-15'),
        location: 'Office',
      });

      const response = await request(app)
        .post(`/api/admin/events/${event.id}/ingredients`)
        .set('Cookie', [`token=${token}`])
        .send({ ingredientId: 999 });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Ingredient not found');
    });

    it('should add ingredient to event', async () => {
      const { token } = await createUserWithToken(true);

      const event = await EventModel.create({
        name: 'Pizza Friday',
        date: new Date('2025-11-15'),
        location: 'Office',
      });

      const ingredient = await Ingredient.create({ name: 'Pepperoni' });

      const response = await request(app)
        .post(`/api/admin/events/${event.id}/ingredients`)
        .set('Cookie', [`token=${token}`])
        .send({ ingredientId: ingredient.id });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        eventId: event.id,
        ingredientId: ingredient.id,
      });

      // Verify in database
      const eventIngredient = await EventIngredient.findOne({
        where: { eventId: event.id, ingredientId: ingredient.id },
      });
      expect(eventIngredient).toBeDefined();
    });

    it('should return 409 if ingredient already added to event', async () => {
      const { token } = await createUserWithToken(true);

      const event = await EventModel.create({
        name: 'Pizza Friday',
        date: new Date('2025-11-15'),
        location: 'Office',
      });

      const ingredient = await Ingredient.create({ name: 'Pepperoni' });

      await EventIngredient.create({
        eventId: event.id,
        ingredientId: ingredient.id,
      });

      const response = await request(app)
        .post(`/api/admin/events/${event.id}/ingredients`)
        .set('Cookie', [`token=${token}`])
        .send({ ingredientId: ingredient.id });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Ingredient already added to this event');
    });

    it('should require ingredientId field', async () => {
      const { token } = await createUserWithToken(true);

      const event = await EventModel.create({
        name: 'Pizza Friday',
        date: new Date('2025-11-15'),
        location: 'Office',
      });

      const response = await request(app)
        .post(`/api/admin/events/${event.id}/ingredients`)
        .set('Cookie', [`token=${token}`])
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ingredientId is required');
    });
  });

  describe('DELETE /api/admin/events/:eventId/ingredients/:ingredientId', () => {
    it('should require authentication', async () => {
      const response = await request(app).delete('/api/admin/events/1/ingredients/1');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin privileges', async () => {
      const { token } = await createUserWithToken(false);

      const response = await request(app)
        .delete('/api/admin/events/1/ingredients/1')
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should return 404 if event not found', async () => {
      const { token } = await createUserWithToken(true);

      const response = await request(app)
        .delete('/api/admin/events/999/ingredients/1')
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Event not found');
    });

    it('should return 404 if ingredient not found', async () => {
      const { token } = await createUserWithToken(true);

      const event = await EventModel.create({
        name: 'Pizza Friday',
        date: new Date('2025-11-15'),
        location: 'Office',
      });

      const response = await request(app)
        .delete(`/api/admin/events/${event.id}/ingredients/999`)
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Ingredient not found');
    });

    it('should return 404 if ingredient not associated with event', async () => {
      const { token } = await createUserWithToken(true);

      const event = await EventModel.create({
        name: 'Pizza Friday',
        date: new Date('2025-11-15'),
        location: 'Office',
      });

      const ingredient = await Ingredient.create({ name: 'Pepperoni' });

      const response = await request(app)
        .delete(`/api/admin/events/${event.id}/ingredients/${ingredient.id}`)
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Ingredient not found in this event');
    });

    it('should remove ingredient from event', async () => {
      const { token } = await createUserWithToken(true);

      const event = await EventModel.create({
        name: 'Pizza Friday',
        date: new Date('2025-11-15'),
        location: 'Office',
      });

      const ingredient = await Ingredient.create({ name: 'Pepperoni' });

      await EventIngredient.create({
        eventId: event.id,
        ingredientId: ingredient.id,
      });

      const response = await request(app)
        .delete(`/api/admin/events/${event.id}/ingredients/${ingredient.id}`)
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});

      // Verify removed from database
      const eventIngredient = await EventIngredient.findOne({
        where: { eventId: event.id, ingredientId: ingredient.id },
      });
      expect(eventIngredient).toBeNull();
    });
  });
});
