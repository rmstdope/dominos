import { Request, Response, NextFunction } from 'express';
import { authenticate, requireAdmin } from '../../src/middleware/auth';
import { generateToken } from '../../src/utils/jwt';

describe('Authentication Middleware', () => {
  const mockSecret = 'test-secret-key';
  const originalEnv = process.env;

  beforeAll(() => {
    process.env = { ...originalEnv, JWT_SECRET: mockSecret, JWT_EXPIRES_IN: '1h' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('authenticate', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
      mockRequest = {
        cookies: {},
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      nextFunction = jest.fn();
    });

    it('should authenticate valid token from cookie', () => {
      const token = generateToken({ userId: 1, username: 'testuser', isAdmin: false });
      mockRequest.cookies = { token };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.userId).toBe(1);
      expect(mockRequest.user?.username).toBe('testuser');
    });

    it('should reject request without token', () => {
      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', () => {
      mockRequest.cookies = { token: 'invalid.token.here' };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request with expired token', () => {
      // Create a token with 0s expiry
      process.env.JWT_EXPIRES_IN = '0s';
      const token = generateToken({ userId: 1, username: 'testuser', isAdmin: false });
      process.env.JWT_EXPIRES_IN = '1h';

      mockRequest.cookies = { token };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
      mockRequest = {
        user: undefined,
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      nextFunction = jest.fn();
    });

    it('should allow admin user', () => {
      mockRequest.user = { userId: 1, username: 'admin', isAdmin: true };

      requireAdmin(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject non-admin user', () => {
      mockRequest.user = { userId: 2, username: 'user', isAdmin: false };

      requireAdmin(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Admin access required' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request without user', () => {
      requireAdmin(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Admin access required' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});
