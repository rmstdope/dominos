import { DataTypes, Model } from 'sequelize';
import { getSequelize } from '../../database/config';

const sequelize = getSequelize();

export class OrderIngredient extends Model {
  declare orderId: number;
  declare ingredientId: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

OrderIngredient.init(
  {
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'orders',
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
    tableName: 'order_ingredients',
    timestamps: true,
  }
);
