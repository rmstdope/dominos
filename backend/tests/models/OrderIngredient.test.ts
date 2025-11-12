import { Order } from '../../src/domains/orders/Order';
import { OrderIngredient } from '../../src/domains/orders/OrderIngredient';
import { Event as EventModel } from '../../src/domains/events/Event';
import { User } from '../../src/domains/users/User';
import { Ingredient } from '../../src/domains/ingredients/Ingredient';
import { getSequelize } from '../../src/database/config';

describe('OrderIngredient Model', () => {
  let sequelize: Awaited<ReturnType<typeof getSequelize>>;

  beforeAll(async () => {
    sequelize = getSequelize();
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await OrderIngredient.destroy({ where: {}, truncate: true, cascade: true });
    await Order.destroy({ where: {}, truncate: true, cascade: true });
    await EventModel.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });
    await Ingredient.destroy({ where: {}, truncate: true, cascade: true });
  });

  describe('OrderIngredient creation', () => {
    it('should create an order-ingredient association', async () => {
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

      const ingredient = await Ingredient.create({
        name: 'Pepperoni',
      });

      const orderIngredient = await OrderIngredient.create({
        orderId: order.id,
        ingredientId: ingredient.id,
      });

      expect(orderIngredient.orderId).toBe(order.id);
      expect(orderIngredient.ingredientId).toBe(ingredient.id);
    });

    it('should require orderId', async () => {
      const ingredient = await Ingredient.create({
        name: 'Pepperoni',
      });

      await expect(
        OrderIngredient.create({
          ingredientId: ingredient.id,
        } as any)
      ).rejects.toThrow();
    });

    it('should require ingredientId', async () => {
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

      await expect(
        OrderIngredient.create({
          orderId: order.id,
        } as any)
      ).rejects.toThrow();
    });

    it('should allow multiple ingredients for the same order', async () => {
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

      const ingredient1 = await Ingredient.create({ name: 'Pepperoni' });
      const ingredient2 = await Ingredient.create({ name: 'Mushrooms' });

      const orderIngredient1 = await OrderIngredient.create({
        orderId: order.id,
        ingredientId: ingredient1.id,
      });

      const orderIngredient2 = await OrderIngredient.create({
        orderId: order.id,
        ingredientId: ingredient2.id,
      });

      expect(orderIngredient1.orderId).toBe(order.id);
      expect(orderIngredient2.orderId).toBe(order.id);
      expect(orderIngredient1.ingredientId).toBe(ingredient1.id);
      expect(orderIngredient2.ingredientId).toBe(ingredient2.id);
    });

    it('should prevent duplicate ingredient for the same order', async () => {
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

      const ingredient = await Ingredient.create({ name: 'Pepperoni' });

      await OrderIngredient.create({
        orderId: order.id,
        ingredientId: ingredient.id,
      });

      // Attempt to create duplicate
      await expect(
        OrderIngredient.create({
          orderId: order.id,
          ingredientId: ingredient.id,
        })
      ).rejects.toThrow();
    });
  });
});
