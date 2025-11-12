import { Router, Request, Response } from 'express';
import { Event as EventModel } from '../domains/events/Event';

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

export default router;
