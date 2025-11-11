import { generateToken, verifyToken } from '../../src/utils/jwt';

describe('JWT Utilities', () => {
  const mockSecret = 'test-secret-key';
  const originalEnv = process.env;

  beforeAll(() => {
    process.env = { ...originalEnv, JWT_SECRET: mockSecret, JWT_EXPIRES_IN: '1h' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = { userId: 1, username: 'testuser', isAdmin: false };
      const token = generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate different tokens for different payloads', () => {
      const payload1 = { userId: 1, username: 'user1', isAdmin: false };
      const payload2 = { userId: 2, username: 'user2', isAdmin: true };

      const token1 = generateToken(payload1);
      const token2 = generateToken(payload2);

      expect(token1).not.toBe(token2);
    });

    it('should throw error if JWT_SECRET is not set', () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      expect(() => generateToken({ userId: 1, username: 'test', isAdmin: false })).toThrow();

      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const payload = { userId: 1, username: 'testuser', isAdmin: false };
      const token = generateToken(payload);

      const decoded = verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(1);
      expect(decoded?.username).toBe('testuser');
      expect(decoded?.isAdmin).toBe(false);
    });

    it('should return null for invalid token', () => {
      const decoded = verifyToken('invalid.token.here');

      expect(decoded).toBeNull();
    });

    it('should return null for expired token', () => {
      // Create a token that expires immediately
      process.env.JWT_EXPIRES_IN = '0s';
      const payload = { userId: 1, username: 'testuser', isAdmin: false };
      const token = generateToken(payload);

      // Wait a bit for it to expire
      const decoded = verifyToken(token);

      expect(decoded).toBeNull();

      process.env.JWT_EXPIRES_IN = '1h';
    });

    it('should return null for token signed with different secret', () => {
      const payload = { userId: 1, username: 'testuser', isAdmin: false };
      const token = generateToken(payload);

      // Change the secret
      const originalSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'different-secret';

      const decoded = verifyToken(token);

      expect(decoded).toBeNull();

      process.env.JWT_SECRET = originalSecret;
    });

    it('should throw error if JWT_SECRET is not set', () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      expect(() => verifyToken('some.token.here')).toThrow();

      process.env.JWT_SECRET = originalSecret;
    });
  });
});
