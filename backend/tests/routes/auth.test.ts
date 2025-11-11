import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../src/server';
import { getSequelize, closeDatabase } from '../../src/database/config';
import { User } from '../../src/domains/users/User';
import { hashPassword } from '../../src/utils/password';

describe('Auth Routes', () => {
  let app: Application;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.JWT_EXPIRES_IN = '1h';

    const sequelize = getSequelize();
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    app = createApp();
    await User.destroy({ where: {}, truncate: true });
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'new@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(201);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('newuser');
      expect(response.body.user.email).toBe('new@example.com');
      expect(response.body.user.password).toBeUndefined(); // Password should not be returned

      // Check that user was created in database
      const user = await User.findOne({ where: { username: 'newuser' } });
      expect(user).toBeDefined();
    });

    it('should set HTTP-only cookie on registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'new@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(201);
      expect(response.headers['set-cookie']).toBeDefined();
      
      const cookies = response.headers['set-cookie'] as unknown as string[];
      const tokenCookie = cookies.find((cookie: string) => cookie.startsWith('token='));
      
      expect(tokenCookie).toBeDefined();
      expect(tokenCookie).toContain('HttpOnly');
    });

    it('should reject registration with existing username', async () => {
      await User.create({
        username: 'existing',
        email: 'existing@example.com',
        password: await hashPassword('password123'),
        isAdmin: false,
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'existing',
          email: 'different@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should reject registration with existing email', async () => {
      await User.create({
        username: 'existing',
        email: 'existing@example.com',
        password: await hashPassword('password123'),
        isAdmin: false,
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'different',
          email: 'existing@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          // missing email and password
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: await hashPassword('password123'),
        isAdmin: false,
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('testuser');
      expect(response.body.user.password).toBeUndefined();
    });

    it('should set HTTP-only cookie on login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.headers['set-cookie']).toBeDefined();
      
      const cookies = response.headers['set-cookie'] as unknown as string[];
      const tokenCookie = cookies.find((cookie: string) => cookie.startsWith('token='));
      
      expect(tokenCookie).toBeDefined();
      expect(tokenCookie).toContain('HttpOnly');
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          // missing password
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear authentication cookie', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out successfully');
      
      const cookies = response.headers['set-cookie'] as unknown as string[];
      const tokenCookie = cookies.find((cookie: string) => cookie.startsWith('token='));
      
      expect(tokenCookie).toBeDefined();
      // Check that the cookie is being cleared (either Max-Age=0 or Expires in the past)
      expect(tokenCookie).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/);
    });
  });

  describe('GET /api/auth/me', () => {
    let authCookie: string;

    beforeEach(async () => {
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: await hashPassword('password123'),
        isAdmin: false,
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123',
        });

      const cookies = loginResponse.headers['set-cookie'] as unknown as string[];
      authCookie = cookies.find((cookie: string) => cookie.startsWith('token=')) || '';
    });

    it('should return current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('testuser');
      expect(response.body.user.password).toBeUndefined();
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });
  });
});
