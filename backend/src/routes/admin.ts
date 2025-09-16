import express, { Response } from 'express';
import database from '../models/database';
import { authenticateToken, AuthenticatedRequest, requireAdmin } from '../middleware/auth';
import { CreatePizzaDinnerRequest, CreateIngredientRequest } from '../models/types';

const router = express.Router();

// Get all pizza dinners
router.get('/pizza-dinners', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pizzaDinners = await database.all(
      'SELECT * FROM pizza_dinners WHERE is_active = 1 ORDER BY scheduled_date ASC'
    );
    res.json(pizzaDinners);
  } catch (error) {
    console.error('Error fetching pizza dinners:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create pizza dinner (admin only)
router.post('/pizza-dinners', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, scheduled_date }: CreatePizzaDinnerRequest = req.body;

    if (!title || !scheduled_date) {
      return res.status(400).json({ error: 'Title and scheduled date are required' });
    }

    const result = await database.run(
      'INSERT INTO pizza_dinners (title, description, scheduled_date) VALUES (?, ?, ?)',
      [title, description || '', scheduled_date]
    );

    const pizzaDinner = await database.get(
      'SELECT * FROM pizza_dinners WHERE id = ?',
      [result.id]
    );

    res.status(201).json(pizzaDinner);
  } catch (error) {
    console.error('Error creating pizza dinner:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update pizza dinner (admin only)
router.put('/pizza-dinners/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, scheduled_date, is_active } = req.body;

    await database.run(
      'UPDATE pizza_dinners SET title = ?, description = ?, scheduled_date = ?, is_active = ? WHERE id = ?',
      [title, description, scheduled_date, is_active, id]
    );

    const pizzaDinner = await database.get(
      'SELECT * FROM pizza_dinners WHERE id = ?',
      [id]
    );

    res.json(pizzaDinner);
  } catch (error) {
    console.error('Error updating pizza dinner:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete pizza dinner (admin only)
router.delete('/pizza-dinners/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    await database.run('DELETE FROM pizza_dinners WHERE id = ?', [id]);
    res.json({ message: 'Pizza dinner deleted successfully' });
  } catch (error) {
    console.error('Error deleting pizza dinner:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all ingredients
router.get('/ingredients', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ingredients = await database.all(
      'SELECT * FROM ingredients WHERE is_available = 1 ORDER BY name ASC'
    );
    res.json(ingredients);
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create ingredient (admin only)
router.post('/ingredients', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description }: CreateIngredientRequest = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await database.run(
      'INSERT INTO ingredients (name, description) VALUES (?, ?)',
      [name, description || '']
    );

    const ingredient = await database.get(
      'SELECT * FROM ingredients WHERE id = ?',
      [result.id]
    );

    res.status(201).json(ingredient);
  } catch (error) {
    console.error('Error creating ingredient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update ingredient (admin only)
router.put('/ingredients/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, is_available } = req.body;

    await database.run(
      'UPDATE ingredients SET name = ?, description = ?, is_available = ? WHERE id = ?',
      [name, description, is_available, id]
    );

    const ingredient = await database.get(
      'SELECT * FROM ingredients WHERE id = ?',
      [id]
    );

    res.json(ingredient);
  } catch (error) {
    console.error('Error updating ingredient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete ingredient (admin only)
router.delete('/ingredients/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    await database.run('DELETE FROM ingredients WHERE id = ?', [id]);
    res.json({ message: 'Ingredient deleted successfully' });
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;