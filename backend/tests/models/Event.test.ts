import { getSequelize } from '../../src/database/config';
import { Event } from '../../src/domains/events/Event';

describe('Event Model', () => {
  const sequelize = getSequelize();

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await Event.destroy({ where: {} });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Model Structure', () => {
    it('should have correct table name', () => {
      expect(Event.tableName).toBe('events');
    });

    it('should have required attributes', async () => {
      const event = await Event.create({
        name: 'Pizza Friday',
        date: new Date('2025-11-15'),
        location: 'Office',
      });

      expect(event.id).toBeDefined();
      expect(event.name).toBe('Pizza Friday');
      expect(event.date).toBeInstanceOf(Date);
      expect(event.location).toBe('Office');
      expect(event.createdAt).toBeInstanceOf(Date);
      expect(event.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('CRUD Operations', () => {
    it('should create a new event', async () => {
      const event = await Event.create({
        name: 'Pizza Friday',
        date: new Date('2025-11-15'),
        location: 'Office',
      });

      expect(event.id).toBeDefined();
      expect(event.name).toBe('Pizza Friday');
    });

    it('should find an event by id', async () => {
      const created = await Event.create({
        name: 'Pizza Friday',
        date: new Date('2025-11-15'),
        location: 'Office',
      });

      const found = await Event.findByPk(created.id);

      expect(found).toBeDefined();
      expect(found?.name).toBe('Pizza Friday');
    });

    it('should update an event', async () => {
      const event = await Event.create({
        name: 'Pizza Friday',
        date: new Date('2025-11-15'),
        location: 'Office',
      });

      event.name = 'Pizza Party';
      await event.save();

      const updated = await Event.findByPk(event.id);
      expect(updated?.name).toBe('Pizza Party');
    });

    it('should delete an event', async () => {
      const event = await Event.create({
        name: 'Pizza Friday',
        date: new Date('2025-11-15'),
        location: 'Office',
      });

      await event.destroy();

      const found = await Event.findByPk(event.id);
      expect(found).toBeNull();
    });

    it('should list all events', async () => {
      await Event.create({
        name: 'Pizza Friday',
        date: new Date('2025-11-15'),
        location: 'Office',
      });
      await Event.create({
        name: 'Pizza Monday',
        date: new Date('2025-11-18'),
        location: 'Remote',
      });

      const events = await Event.findAll();
      expect(events).toHaveLength(2);
    });
  });

  describe('Validations', () => {
    it('should require name', async () => {
      await expect(
        Event.create({
          name: '',
          date: new Date('2025-11-15'),
          location: 'Office',
        })
      ).rejects.toThrow();
    });

    it('should require date', async () => {
      await expect(
        Event.create({
          name: 'Pizza Friday',
          location: 'Office',
        } as unknown as { name: string; date: Date; location: string })
      ).rejects.toThrow();
    });

    it('should require location', async () => {
      await expect(
        Event.create({
          name: 'Pizza Friday',
          date: new Date('2025-11-15'),
          location: '',
        })
      ).rejects.toThrow();
    });

    it('should enforce name length', async () => {
      const longName = 'a'.repeat(256);
      await expect(
        Event.create({
          name: longName,
          date: new Date('2025-11-15'),
          location: 'Office',
        })
      ).rejects.toThrow();
    });

    it('should enforce location length', async () => {
      const longLocation = 'a'.repeat(256);
      await expect(
        Event.create({
          name: 'Pizza Friday',
          date: new Date('2025-11-15'),
          location: longLocation,
        })
      ).rejects.toThrow();
    });
  });
});
