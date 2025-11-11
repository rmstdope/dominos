import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { User } from '../domains/users/User';
import { Ingredient } from '../domains/ingredients/Ingredient';

const router = Router();

// GET /api/admin/users - List all users with their admin status
router.get('/users', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'isAdmin'],
      order: [['id', 'ASC']],
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/users/:id - Grant or revoke admin privileges
router.patch('/users/:id', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isAdmin } = req.body;

    // Validate isAdmin field is present
    if (isAdmin === undefined) {
      res.status(400).json({ error: 'isAdmin field is required' });
      return;
    }

    // Validate isAdmin is a boolean
    if (typeof isAdmin !== 'boolean') {
      res.status(400).json({ error: 'isAdmin must be a boolean' });
      return;
    }

    // Find the user
    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Update admin status
    user.isAdmin = isAdmin;
    await user.save();

    // Return updated user without password
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
    });
  } catch (error) {
    console.error('Error updating user admin status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/ingredients - List all ingredients
router.get('/ingredients', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const ingredients = await Ingredient.findAll({
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    });

    res.json(ingredients);
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
