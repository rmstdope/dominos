import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { User } from '../domains/users/User';
import { Ingredient } from '../domains/ingredients/Ingredient';
import { Event as EventModel } from '../domains/events/Event';
import { EventIngredient } from '../domains/events/EventIngredient';
import { Order } from '../domains/orders/Order';
import { OrderIngredient } from '../domains/orders/OrderIngredient';

const router = Router();

interface TransformedOrder {
  id: number;
  userId: number;
  userName: string;
  eventId: number;
  eventName: string;
  size: string;
  ingredients: string[];
  createdAt: Date;
}


// GET /api/admin/users - List all users with their admin status
router.get('/users', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'isAdmin'],
      order: [['id', 'ASC']],
    });

    res.json({ users });
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

    res.json({ ingredients });
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/ingredients - Add new ingredient
router.post('/ingredients', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;

    // Validate name field is present
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    // Validate name is not empty (trim whitespace)
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      res.status(400).json({ error: 'Name cannot be empty' });
      return;
    }

    // Validate name length
    if (trimmedName.length > 100) {
      res.status(400).json({ error: 'Name must be between 1 and 100 characters' });
      return;
    }

    // Check if ingredient already exists
    const existing = await Ingredient.findOne({ where: { name: trimmedName } });
    if (existing) {
      res.status(409).json({ error: 'Ingredient already exists' });
      return;
    }

    // Create new ingredient
    const ingredient = await Ingredient.create({ name: trimmedName });

    res.status(201).json(ingredient);
  } catch (error) {
    console.error('Error creating ingredient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/ingredients/:id - Delete an ingredient
router.delete('/ingredients/:id', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const ingredientId = parseInt(req.params.id, 10);

    const ingredient = await Ingredient.findByPk(ingredientId);

    if (!ingredient) {
      res.status(404).json({ error: 'Ingredient not found' });
      return;
    }

    await ingredient.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/events - List all events
router.get('/events', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const events = await EventModel.findAll({
      attributes: ['id', 'name', 'date', 'location'],
      order: [['date', 'DESC']],
    });

    res.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/events - Create new event
router.post('/events', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, date, location } = req.body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    if (!date) {
      res.status(400).json({ error: 'Date is required' });
      return;
    }

    if (!location || location.trim().length === 0) {
      res.status(400).json({ error: 'Location is required' });
      return;
    }

    // Validate date format
    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
      res.status(400).json({ error: 'Invalid date format' });
      return;
    }

    // Create new event
    const event = await EventModel.create({
      name: name.trim(),
      date: eventDate,
      location: location.trim(),
    });

    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/events/:id - Delete an event
router.delete('/events/:id', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = parseInt(req.params.id, 10);

    const event = await EventModel.findByPk(eventId);

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Delete all EventIngredient associations first
    await EventIngredient.destroy({
      where: { eventId },
    });

    await event.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/events/:eventId/ingredients - List ingredients for an event
router.get('/events/:eventId/ingredients', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = parseInt(req.params.eventId, 10);

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
      res.json([]);
      return;
    }

    const ingredients = await Ingredient.findAll({
      where: { id: ingredientIds },
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    });

    res.json(ingredients);
  } catch (error) {
    console.error('Error fetching event ingredients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/events/:eventId/ingredients - Add ingredient to event
router.post('/events/:eventId/ingredients', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    const { ingredientId } = req.body;

    // Validate ingredientId is provided
    if (!ingredientId) {
      res.status(400).json({ error: 'ingredientId is required' });
      return;
    }

    // Check if event exists
    const event = await EventModel.findByPk(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Check if ingredient exists
    const ingredient = await Ingredient.findByPk(ingredientId);
    if (!ingredient) {
      res.status(404).json({ error: 'Ingredient not found' });
      return;
    }

    // Check if association already exists
    const existing = await EventIngredient.findOne({
      where: { eventId, ingredientId },
    });

    if (existing) {
      res.status(409).json({ error: 'Ingredient already added to this event' });
      return;
    }

    // Create association
    const eventIngredient = await EventIngredient.create({
      eventId,
      ingredientId,
    });

    res.status(201).json(eventIngredient);
  } catch (error) {
    console.error('Error adding ingredient to event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/events/:eventId/ingredients/:ingredientId - Remove ingredient from event
router.delete('/events/:eventId/ingredients/:ingredientId', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    const ingredientId = parseInt(req.params.ingredientId, 10);

    // Check if event exists
    const event = await EventModel.findByPk(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Check if ingredient exists
    const ingredient = await Ingredient.findByPk(ingredientId);
    if (!ingredient) {
      res.status(404).json({ error: 'Ingredient not found' });
      return;
    }

    // Find the association
    const eventIngredient = await EventIngredient.findOne({
      where: { eventId, ingredientId },
    });

    if (!eventIngredient) {
      res.status(404).json({ error: 'Ingredient not found in this event' });
      return;
    }

    await eventIngredient.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Error removing ingredient from event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/orders - List all orders with user, event, and ingredient details
router.get('/orders', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const orders = await Order.findAll({
      include: [
        {
          model: User,
          attributes: ['id', 'username'],
        },
        {
          model: EventModel,
          as: 'Event',
          attributes: ['id', 'name'],
        },
        {
          model: OrderIngredient,
          as: 'OrderIngredients',
          include: [
            {
              model: Ingredient,
              attributes: ['name'],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Transform the data to match the expected format
    const transformedOrders: TransformedOrder[] = orders.map((order) => {
      const orderData = order.toJSON() as any;
      
      return {
        id: orderData.id,
        userId: orderData.userId,
        userName: orderData.User?.username || '',
        eventId: orderData.eventId,
        eventName: orderData.Event?.name || '',
        size: orderData.size,
        ingredients: orderData.OrderIngredients?.map((oi: any) => oi.Ingredient?.name).filter(Boolean) || [],
        createdAt: orderData.createdAt,
      };
    });

    res.json({ orders: transformedOrders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/orders/:id - Delete a specific order
router.delete('/orders/:id', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id, 10);

    const order = await Order.findByPk(orderId);

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    await order.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
