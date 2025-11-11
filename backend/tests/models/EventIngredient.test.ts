import { getSequelize } from '../../src/database/config';
import { Event as EventModel } from '../../src/domains/events/Event';
import { Ingredient } from '../../src/domains/ingredients/Ingredient';
import { EventIngredient } from '../../src/domains/events/EventIngredient';

describe('EventIngredient Model', () => {
  const sequelize = getSequelize();

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await EventIngredient.destroy({ where: {} });
    await EventModel.destroy({ where: {} });
    await Ingredient.destroy({ where: {} });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Model Structure', () => {
    it('should have correct table name', () => {
      expect(EventIngredient.tableName).toBe('event_ingredients');
    });

    it('should create an association between event and ingredient', async () => {
      const event = await EventModel.create({
        name: 'Pizza Friday',
        date: new Date('2025-11-15'),
        location: 'Office',
      });

      const ingredient = await Ingredient.create({
        name: 'Pepperoni',
      });

      const eventIngredient = await EventIngredient.create({
        eventId: event.id,
        ingredientId: ingredient.id,
      });

      expect(eventIngredient.eventId).toBe(event.id);
      expect(eventIngredient.ingredientId).toBe(ingredient.id);
    });
  });

  describe('Validations', () => {
    it('should require eventId', async () => {
      const ingredient = await Ingredient.create({
        name: 'Pepperoni',
      });

      await expect(
        EventIngredient.create({
          ingredientId: ingredient.id,
        } as unknown as { eventId: number; ingredientId: number })
      ).rejects.toThrow();
    });

    it('should require ingredientId', async () => {
      const event = await EventModel.create({
        name: 'Pizza Friday',
        date: new Date('2025-11-15'),
        location: 'Office',
      });

      await expect(
        EventIngredient.create({
          eventId: event.id,
        } as unknown as { eventId: number; ingredientId: number })
      ).rejects.toThrow();
    });

    it('should prevent duplicate event-ingredient pairs', async () => {
      const event = await EventModel.create({
        name: 'Pizza Friday',
        date: new Date('2025-11-15'),
        location: 'Office',
      });

      const ingredient = await Ingredient.create({
        name: 'Pepperoni',
      });

      await EventIngredient.create({
        eventId: event.id,
        ingredientId: ingredient.id,
      });

      await expect(
        EventIngredient.create({
          eventId: event.id,
          ingredientId: ingredient.id,
        })
      ).rejects.toThrow();
    });
  });

  describe('Associations', () => {
    it('should allow same ingredient on multiple events', async () => {
      const event1 = await EventModel.create({
        name: 'Pizza Friday',
        date: new Date('2025-11-15'),
        location: 'Office',
      });

      const event2 = await EventModel.create({
        name: 'Pizza Monday',
        date: new Date('2025-11-18'),
        location: 'Remote',
      });

      const ingredient = await Ingredient.create({
        name: 'Pepperoni',
      });

      const ei1 = await EventIngredient.create({
        eventId: event1.id,
        ingredientId: ingredient.id,
      });

      const ei2 = await EventIngredient.create({
        eventId: event2.id,
        ingredientId: ingredient.id,
      });

      expect(ei1.ingredientId).toBe(ingredient.id);
      expect(ei2.ingredientId).toBe(ingredient.id);
      expect(ei1.eventId).not.toBe(ei2.eventId);
    });

    it('should allow multiple ingredients on same event', async () => {
      const event = await EventModel.create({
        name: 'Pizza Friday',
        date: new Date('2025-11-15'),
        location: 'Office',
      });

      const ingredient1 = await Ingredient.create({
        name: 'Pepperoni',
      });

      const ingredient2 = await Ingredient.create({
        name: 'Mushrooms',
      });

      const ei1 = await EventIngredient.create({
        eventId: event.id,
        ingredientId: ingredient1.id,
      });

      const ei2 = await EventIngredient.create({
        eventId: event.id,
        ingredientId: ingredient2.id,
      });

      expect(ei1.eventId).toBe(event.id);
      expect(ei2.eventId).toBe(event.id);
      expect(ei1.ingredientId).not.toBe(ei2.ingredientId);
    });
  });
});
