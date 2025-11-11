import { DataTypes, Model } from 'sequelize';
import { getSequelize } from '../../database/config';

const sequelize = getSequelize();

export class Event extends Model {
  declare id: number;
  declare name: string;
  declare date: Date;
  declare location: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Event.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
  },
  {
    sequelize,
    tableName: 'events',
    timestamps: true,
  }
);
