import { Router, Request, Response } from 'express';
import { Event as EventModel } from '../domains/events/Event';
import { Ingredient } from '../domains/ingredients/Ingredient';
import { EventIngredient } from '../domains/events/EventIngredient';

const router = Router();

// GET /api/events - List all events (public endpoint)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const events = await EventModel.findAll({
      attributes: ['id', 'name', 'date', 'location'],
      order: [['date', 'ASC']],
    });

    res.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/events/:id - Get a single event by ID (public endpoint)
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = parseInt(req.params.id, 10);

    // Validate ID format
    if (isNaN(eventId)) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const event = await EventModel.findByPk(eventId, {
      attributes: ['id', 'name', 'date', 'location'],
    });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/events/:id/ingredients - Get ingredients for a specific event (public endpoint)
router.get('/:id/ingredients', async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = parseInt(req.params.id, 10);

    // Validate ID format
    if (isNaN(eventId)) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Check if event exists
    const event = await EventModel.findByPk(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Get all ingredients for this event
    const eventIngredients = await EventIngredient.findAll({
      where: { eventId },
      attributes: ['ingredientId'],
    });

    const ingredientIds = eventIngredients.map((ei) => ei.ingredientId);

    if (ingredientIds.length === 0) {
      res.json({ ingredients: [] });
      return;
    }

    const ingredients = await Ingredient.findAll({
      where: { id: ingredientIds },
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    });

    res.json({ ingredients });
  } catch (error) {
    console.error('Error fetching event ingredients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

