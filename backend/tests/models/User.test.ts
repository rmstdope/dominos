import { getSequelize, closeDatabase } from '../../src/database/config';
import { User } from '../../src/domains/users/User';

describe('User Model', () => {
  beforeAll(async () => {
    const sequelize = getSequelize();
    await sequelize.sync({ force: true }); // Recreate tables
  });

  afterAll(async () => {
    await closeDatabase();
  });

  afterEach(async () => {
    await User.destroy({ where: {}, truncate: true });
  });

  describe('Model Structure', () => {
    it('should have correct table name', () => {
      expect(User.tableName).toBe('users');
    });

    it('should have required attributes', () => {
      const attributes = User.getAttributes();
      
      expect(attributes).toHaveProperty('id');
      expect(attributes).toHaveProperty('username');
      expect(attributes).toHaveProperty('email');
      expect(attributes).toHaveProperty('password');
      expect(attributes).toHaveProperty('isAdmin');
      expect(attributes).toHaveProperty('createdAt');
      expect(attributes).toHaveProperty('updatedAt');
    });
  });

  describe('CRUD Operations', () => {
    it('should create a new user', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword123',
        isAdmin: false,
      });

      expect(user.id).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.isAdmin).toBe(false);
    });

    it('should find a user by id', async () => {
      const created = await User.create({
        username: 'findme',
        email: 'findme@example.com',
        password: 'hashedpassword123',
        isAdmin: false,
      });

      const found = await User.findByPk(created.id);

      expect(found).toBeDefined();
      expect(found?.username).toBe('findme');
    });

    it('should find a user by username', async () => {
      await User.create({
        username: 'uniqueuser',
        email: 'unique@example.com',
        password: 'hashedpassword123',
        isAdmin: false,
      });

      const found = await User.findOne({ where: { username: 'uniqueuser' } });

      expect(found).toBeDefined();
      expect(found?.email).toBe('unique@example.com');
    });

    it('should update a user', async () => {
      const user = await User.create({
        username: 'updateme',
        email: 'update@example.com',
        password: 'hashedpassword123',
        isAdmin: false,
      });

      await user.update({ email: 'newemail@example.com' });

      const updated = await User.findByPk(user.id);
      expect(updated?.email).toBe('newemail@example.com');
    });

    it('should delete a user', async () => {
      const user = await User.create({
        username: 'deleteme',
        email: 'delete@example.com',
        password: 'hashedpassword123',
        isAdmin: false,
      });

      await user.destroy();

      const found = await User.findByPk(user.id);
      expect(found).toBeNull();
    });

    it('should list all users', async () => {
      await User.create({
        username: 'user1',
        email: 'user1@example.com',
        password: 'hashedpassword123',
        isAdmin: false,
      });

      await User.create({
        username: 'user2',
        email: 'user2@example.com',
        password: 'hashedpassword123',
        isAdmin: true,
      });

      const users = await User.findAll();
      expect(users).toHaveLength(2);
    });
  });

  describe('Validations', () => {
    it('should require username', async () => {
      await expect(
        User.create({
          username: '',
          email: 'test@example.com',
          password: 'hashedpassword123',
          isAdmin: false,
        })
      ).rejects.toThrow();
    });

    it('should require email', async () => {
      await expect(
        User.create({
          username: 'testuser',
          email: '',
          password: 'hashedpassword123',
          isAdmin: false,
        })
      ).rejects.toThrow();
    });

    it('should require password', async () => {
      await expect(
        User.create({
          username: 'testuser',
          email: 'test@example.com',
          password: '',
          isAdmin: false,
        })
      ).rejects.toThrow();
    });

    it('should enforce unique username', async () => {
      await User.create({
        username: 'duplicate',
        email: 'first@example.com',
        password: 'hashedpassword123',
        isAdmin: false,
      });

      await expect(
        User.create({
          username: 'duplicate',
          email: 'second@example.com',
          password: 'hashedpassword123',
          isAdmin: false,
        })
      ).rejects.toThrow();
    });

    it('should enforce unique email', async () => {
      await User.create({
        username: 'first',
        email: 'duplicate@example.com',
        password: 'hashedpassword123',
        isAdmin: false,
      });

      await expect(
        User.create({
          username: 'second',
          email: 'duplicate@example.com',
          password: 'hashedpassword123',
          isAdmin: false,
        })
      ).rejects.toThrow();
    });

    it('should default isAdmin to false', async () => {
      const user = await User.create({
        username: 'normaluser',
        email: 'normal@example.com',
        password: 'hashedpassword123',
      });

      expect(user.isAdmin).toBe(false);
    });
  });
});
