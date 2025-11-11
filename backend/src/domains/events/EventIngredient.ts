import { DataTypes, Model } from 'sequelize';
import { getSequelize } from '../../database/config';

const sequelize = getSequelize();

export class EventIngredient extends Model {
  declare eventId: number;
  declare ingredientId: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

EventIngredient.init(
  {
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'events',
        key: 'id',
      },
    },
    ingredientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'ingredients',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    tableName: 'event_ingredients',
    timestamps: true,
  }
);
