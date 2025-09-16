import express, { Response } from 'express';
import database from '../models/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { UpdateSelectionRequest } from '../models/types';

const router = express.Router();

// Get user's selections for a specific pizza dinner
router.get('/selections/:pizzaDinnerId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { pizzaDinnerId } = req.params;
    const userId = req.user!.id;

    const selections = await database.all(
      `SELECT us.*, i.name as ingredient_name, i.description as ingredient_description
       FROM user_selections us
       JOIN ingredients i ON us.ingredient_id = i.id
       WHERE us.user_id = ? AND us.pizza_dinner_id = ?`,
      [userId, pizzaDinnerId]
    );

    res.json(selections);
  } catch (error) {
    console.error('Error fetching user selections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user's selections for a pizza dinner
router.put('/selections', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { pizza_dinner_id, ingredient_ids }: UpdateSelectionRequest = req.body;
    const userId = req.user!.id;

    if (!pizza_dinner_id || !Array.isArray(ingredient_ids)) {
      return res.status(400).json({ error: 'Pizza dinner ID and ingredient IDs array are required' });
    }

    // Remove existing selections for this user and pizza dinner
    await database.run(
      'DELETE FROM user_selections WHERE user_id = ? AND pizza_dinner_id = ?',
      [userId, pizza_dinner_id]
    );

    // Add new selections
    for (const ingredientId of ingredient_ids) {
      await database.run(
        'INSERT INTO user_selections (user_id, pizza_dinner_id, ingredient_id) VALUES (?, ?, ?)',
        [userId, pizza_dinner_id, ingredientId]
      );
    }

    // Fetch updated selections
    const selections = await database.all(
      `SELECT us.*, i.name as ingredient_name, i.description as ingredient_description
       FROM user_selections us
       JOIN ingredients i ON us.ingredient_id = i.id
       WHERE us.user_id = ? AND us.pizza_dinner_id = ?`,
      [userId, pizza_dinner_id]
    );

    res.json({
      message: 'Selections updated successfully',
      selections
    });
  } catch (error) {
    console.error('Error updating user selections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all selections for a pizza dinner (admin only)
router.get('/pizza-dinners/:id/selections', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const selections = await database.all(
      `SELECT us.*, u.username, i.name as ingredient_name
       FROM user_selections us
       JOIN users u ON us.user_id = u.id
       JOIN ingredients i ON us.ingredient_id = i.id
       WHERE us.pizza_dinner_id = ?
       ORDER BY u.username, i.name`,
      [id]
    );

    // Group by user
    const groupedSelections: { [key: string]: any } = {};
    selections.forEach(selection => {
      if (!groupedSelections[selection.username]) {
        groupedSelections[selection.username] = {
          user_id: selection.user_id,
          username: selection.username,
          ingredients: []
        };
      }
      groupedSelections[selection.username].ingredients.push({
        id: selection.ingredient_id,
        name: selection.ingredient_name
      });
    });

    res.json(Object.values(groupedSelections));
  } catch (error) {
    console.error('Error fetching pizza dinner selections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;