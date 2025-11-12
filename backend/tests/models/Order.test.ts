import { Order } from '../../src/domains/orders/Order';
import { OrderIngredient } from '../../src/domains/orders/OrderIngredient';
import { Event as EventModel } from '../../src/domains/events/Event';
import { User } from '../../src/domains/users/User';
import { Ingredient } from '../../src/domains/ingredients/Ingredient';
import { getSequelize } from '../../src/database/config';

describe('Order Model', () => {
  let sequelize: Awaited<ReturnType<typeof getSequelize>>;

  beforeAll(async () => {
    sequelize = getSequelize();
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await Order.destroy({ where: {}, truncate: true, cascade: true });
    await OrderIngredient.destroy({ where: {}, truncate: true, cascade: true });
    await EventModel.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });
    await Ingredient.destroy({ where: {}, truncate: true, cascade: true });
  });

  describe('Order creation', () => {
    it('should create an order with valid data', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });

      const event = await EventModel.create({
        name: 'Test Event',
        date: new Date('2025-12-31'),
        location: 'Test Location',
      });

      const order = await Order.create({
        userId: user.id,
        eventId: event.id,
        size: 'Standard',
      });

      expect(order.id).toBeDefined();
      expect(order.userId).toBe(user.id);
      expect(order.eventId).toBe(event.id);
      expect(order.size).toBe('Standard');
      expect(order.createdAt).toBeDefined();
      expect(order.updatedAt).toBeDefined();
    });

    it('should accept "Small" as a valid size', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });

      const event = await EventModel.create({
        name: 'Test Event',
        date: new Date('2025-12-31'),
        location: 'Test Location',
      });

      const order = await Order.create({
        userId: user.id,
        eventId: event.id,
        size: 'Small',
      });

      expect(order.size).toBe('Small');
    });

    it('should require userId', async () => {
      const event = await EventModel.create({
        name: 'Test Event',
        date: new Date('2025-12-31'),
        location: 'Test Location',
      });

      await expect(
        Order.create({
          eventId: event.id,
          size: 'Standard',
        } as any)
      ).rejects.toThrow();
    });

    it('should require eventId', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });

      await expect(
        Order.create({
          userId: user.id,
          size: 'Standard',
        } as any)
      ).rejects.toThrow();
    });

    it('should require size', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });

      const event = await EventModel.create({
        name: 'Test Event',
        date: new Date('2025-12-31'),
        location: 'Test Location',
      });

      await expect(
        Order.create({
          userId: user.id,
          eventId: event.id,
        } as any)
      ).rejects.toThrow();
    });

    it('should enforce unique order per user per event', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });

      const event = await EventModel.create({
        name: 'Test Event',
        date: new Date('2025-12-31'),
        location: 'Test Location',
      });

      await Order.create({
        userId: user.id,
        eventId: event.id,
        size: 'Standard',
      });

      // Attempt to create duplicate order
      await expect(
        Order.create({
          userId: user.id,
          eventId: event.id,
          size: 'Small',
        })
      ).rejects.toThrow();
    });
  });
});
