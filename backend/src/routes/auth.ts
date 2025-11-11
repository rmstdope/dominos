import { Router, Request, Response } from 'express';
import { User } from '../domains/users/User';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { authenticate } from '../middleware/auth';

const router = Router();

// Register a new user
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create the user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      isAdmin: false,
    });

    // Generate token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    });

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return user without password
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(201).json({ user: userResponse });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ error: 'Username or email already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Find user by username
    const user = await User.findOne({ where: { username } });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    });

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return user without password
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json({ user: userResponse });
  } catch (_error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
router.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findByPk(req.user!.userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Return user without password
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json({ user: userResponse });
  } catch (_error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
