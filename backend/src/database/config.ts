import { Sequelize } from 'sequelize';
import path from 'path';

let sequelize: Sequelize | null = null;

export function getSequelize(): Sequelize {
  if (!sequelize) {
    const env = process.env.NODE_ENV || 'development';

    let config: {
      dialect: 'sqlite';
      storage: string;
      logging?: boolean | ((sql: string, timing?: number) => void);
    };

    if (env === 'test') {
      config = {
        dialect: 'sqlite',
        storage: ':memory:',
        logging: false,
      };
    } else if (env === 'production') {
      config = {
        dialect: 'sqlite',
        storage: path.join(__dirname, '../../data/dominos.sqlite'),
        logging: false,
      };
    } else {
      // development
      config = {
        dialect: 'sqlite',
        storage: path.join(__dirname, '../../data/dominos-dev.sqlite'),
        logging: false,
      };
    }

    sequelize = new Sequelize(config);
  }

  return sequelize;
}

export const closeDatabase = async (): Promise<void> => {
  if (sequelize) {
    await sequelize.close();
    sequelize = null;
  }
};
