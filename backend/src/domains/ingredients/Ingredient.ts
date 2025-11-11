import { Model, DataTypes, Optional } from 'sequelize';
import { getSequelize } from '../../database/config';

interface IngredientAttributes {
  id: number;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type IngredientCreationAttributes = Optional<IngredientAttributes, 'id'>;

export class Ingredient extends Model<IngredientAttributes, IngredientCreationAttributes> {
  declare id: number;
  declare name: string;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

const sequelize = getSequelize();

Ingredient.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
  },
  {
    sequelize,
    tableName: 'ingredients',
    timestamps: true,
    underscored: true,
  }
);

export type { IngredientAttributes, IngredientCreationAttributes };
