import { Router, Request, Response } from 'express';
import { Event as EventModel } from '../domains/events/Event';
import { Ingredient } from '../domains/ingredients/Ingredient';
import { EventIngredient } from '../domains/events/EventIngredient';
import { authenticate } from '../middleware/auth';
import { Order } from '../domains/orders/Order';
import { OrderIngredient } from '../domains/orders/OrderIngredient';

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

// POST /api/events/:eventId/orders - Create a new pizza order for an event
router.post('/:eventId/orders', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    const { size, ingredientIds } = req.body;
    const userId = req.user!.userId;

    // Validate event ID
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

    // Validate size
    if (!size) {
      res.status(400).json({ error: 'size is required' });
      return;
    }

    if (size !== 'Standard' && size !== 'Small') {
      res.status(400).json({ error: 'size must be either "Standard" or "Small"' });
      return;
    }

    // Validate ingredientIds
    if (!Array.isArray(ingredientIds)) {
      res.status(400).json({ error: 'ingredientIds must be an array' });
      return;
    }

    // Validate all ingredient IDs are numbers
    for (const id of ingredientIds) {
      if (typeof id !== 'number' || !Number.isInteger(id)) {
        res.status(400).json({ error: 'All ingredient IDs must be valid numbers' });
        return;
      }
    }

    // Check if user already has an order for this event
    const existingOrder = await Order.findOne({
      where: { userId, eventId },
    });

    if (existingOrder) {
      res.status(409).json({ error: 'You already have an order for this event' });
      return;
    }

    // Create the order
    const order = await Order.create({
      userId,
      eventId,
      size,
    });

    // Create order-ingredient associations
    if (ingredientIds.length > 0) {
      await Promise.all(
        ingredientIds.map((ingredientId: number) =>
          OrderIngredient.create({
            orderId: order.id,
            ingredientId,
          })
        )
      );
    }

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: order.id,
        userId: order.userId,
        eventId: order.eventId,
        size: order.size,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/events/:eventId/orders/my-order - Get the current user's order for an event
router.get('/:eventId/orders/my-order', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    const userId = req.user!.userId;

    // Validate event ID
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

    // Find user's order for this event
    const order = await Order.findOne({
      where: { userId, eventId },
    });

    if (!order) {
      res.status(404).json({ error: 'No order found for this event' });
      return;
    }

    // Get order ingredients
    const orderIngredients = await OrderIngredient.findAll({
      where: { orderId: order.id },
      attributes: ['ingredientId'],
    });

    const ingredientIds = orderIngredients.map((oi) => oi.ingredientId);

    res.json({
      order: {
        id: order.id,
        userId: order.userId,
        eventId: order.eventId,
        size: order.size,
        ingredientIds,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

