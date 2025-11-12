import { DataTypes, Model, Optional } from 'sequelize';
import { getSequelize } from '../../database/config';

interface OrderAttributes {
  id: number;
  userId: number;
  eventId: number;
  size: 'Standard' | 'Small';
  createdAt?: Date;
  updatedAt?: Date;
}

type OrderCreationAttributes = Optional<OrderAttributes, 'id'>;

export class Order extends Model<OrderAttributes, OrderCreationAttributes> {
  declare id: number;
  declare userId: number;
  declare eventId: number;
  declare size: 'Standard' | 'Small';
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

const sequelize = getSequelize();

Order.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'events',
        key: 'id',
      },
    },
    size: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['Standard', 'Small']],
      },
    },
  },
  {
    sequelize,
    tableName: 'orders',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'eventId'],
        name: 'unique_user_event_order',
      },
    ],
  }
);

export type { OrderAttributes, OrderCreationAttributes };
