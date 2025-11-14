import { Sequelize } from 'sequelize';
import path from 'path';

let sequelize: Sequelize | null = null;

export function getSequelize(): Sequelize {
  if (!sequelize) {
    const env = process.env.NODE_ENV || 'development';
    const databaseUrl = process.env.DATABASE_URL;

    // Use PostgreSQL if DATABASE_URL is provided (Render production)
    if (databaseUrl) {
      sequelize = new Sequelize(databaseUrl, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false, // Required for Render PostgreSQL
          },
        },
      });
    } else if (env === 'test') {
      // SQLite in-memory for tests
      sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: ':memory:',
        logging: false,
      });
    } else if (env === 'production') {
      // SQLite for production without DATABASE_URL
      sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: path.join(__dirname, '../../data/dominos.sqlite'),
        logging: false,
      });
    } else {
      // SQLite for development
      sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: path.join(__dirname, '../../data/dominos-dev.sqlite'),
        logging: false,
      });
    }
  }

  return sequelize;
}

export const closeDatabase = async (): Promise<void> => {
  if (sequelize) {
    await sequelize.close();
    sequelize = null;
  }
};
