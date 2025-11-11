import { getSequelize, closeDatabase } from '../../src/database/config';
import { Ingredient } from '../../src/domains/ingredients/Ingredient';

describe('Ingredient Model', () => {
  beforeAll(async () => {
    const sequelize = getSequelize();
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await Ingredient.destroy({ where: {}, truncate: true });
  });

  describe('Model Structure', () => {
    it('should have correct table name', () => {
      expect(Ingredient.tableName).toBe('ingredients');
    });

    it('should have required attributes', async () => {
      const ingredient = await Ingredient.create({ name: 'Pepperoni' });

      expect(ingredient).toHaveProperty('id');
      expect(ingredient).toHaveProperty('name');
      expect(ingredient).toHaveProperty('createdAt');
      expect(ingredient).toHaveProperty('updatedAt');
    });
  });

  describe('CRUD Operations', () => {
    it('should create a new ingredient', async () => {
      const ingredient = await Ingredient.create({ name: 'Mushrooms' });

      expect(ingredient.id).toBeDefined();
      expect(ingredient.name).toBe('Mushrooms');
      expect(ingredient.createdAt).toBeInstanceOf(Date);
      expect(ingredient.updatedAt).toBeInstanceOf(Date);
    });

    it('should find an ingredient by id', async () => {
      const created = await Ingredient.create({ name: 'Olives' });
      const found = await Ingredient.findByPk(created.id);

      expect(found).toBeDefined();
      expect(found?.name).toBe('Olives');
    });

    it('should update an ingredient', async () => {
      const ingredient = await Ingredient.create({ name: 'Green Peppers' });
      ingredient.name = 'Red Peppers';
      await ingredient.save();

      const updated = await Ingredient.findByPk(ingredient.id);
      expect(updated?.name).toBe('Red Peppers');
    });

    it('should delete an ingredient', async () => {
      const ingredient = await Ingredient.create({ name: 'Onions' });
      await ingredient.destroy();

      const found = await Ingredient.findByPk(ingredient.id);
      expect(found).toBeNull();
    });

    it('should list all ingredients', async () => {
      await Ingredient.create({ name: 'Pepperoni' });
      await Ingredient.create({ name: 'Mushrooms' });
      await Ingredient.create({ name: 'Olives' });

      const ingredients = await Ingredient.findAll();
      expect(ingredients).toHaveLength(3);
    });
  });

  describe('Validations', () => {
    it('should require name', async () => {
      await expect(Ingredient.create({ name: '' })).rejects.toThrow();
    });

    it('should enforce unique name', async () => {
      await Ingredient.create({ name: 'Pepperoni' });
      await expect(Ingredient.create({ name: 'Pepperoni' })).rejects.toThrow();
    });

    it('should enforce name length', async () => {
      const longName = 'a'.repeat(101);
      await expect(Ingredient.create({ name: longName })).rejects.toThrow();
    });
  });
});
