import { User } from '../domains/users/User';
import { Event as EventModel } from '../domains/events/Event';
import { EventIngredient } from '../domains/events/EventIngredient';
import { Ingredient } from '../domains/ingredients/Ingredient';
import { Order } from '../domains/orders/Order';
import { OrderIngredient } from '../domains/orders/OrderIngredient';

/**
 * Set up all Sequelize model associations.
 * This must be called after all models are initialized but before they are used.
 */
export function setupAssociations(): void {
  // User <-> Order (one-to-many)
  User.hasMany(Order, {
    foreignKey: 'userId',
    as: 'orders',
  });
  Order.belongsTo(User, {
    foreignKey: 'userId',
  });

  // Event <-> Order (one-to-many)
  EventModel.hasMany(Order, {
    foreignKey: 'eventId',
    as: 'orders',
  });
  Order.belongsTo(EventModel, {
    foreignKey: 'eventId',
    as: 'Event',
  });

  // Order <-> OrderIngredient (one-to-many)
  Order.hasMany(OrderIngredient, {
    foreignKey: 'orderId',
    as: 'OrderIngredients',
    onDelete: 'CASCADE',
  });
  OrderIngredient.belongsTo(Order, {
    foreignKey: 'orderId',
  });

  // Ingredient <-> OrderIngredient (one-to-many)
  Ingredient.hasMany(OrderIngredient, {
    foreignKey: 'ingredientId',
  });
  OrderIngredient.belongsTo(Ingredient, {
    foreignKey: 'ingredientId',
  });

  // Event <-> EventIngredient (one-to-many)
  EventModel.hasMany(EventIngredient, {
    foreignKey: 'eventId',
  });
  EventIngredient.belongsTo(EventModel, {
    foreignKey: 'eventId',
  });

  // Ingredient <-> EventIngredient (one-to-many)
  Ingredient.hasMany(EventIngredient, {
    foreignKey: 'ingredientId',
  });
  EventIngredient.belongsTo(Ingredient, {
    foreignKey: 'ingredientId',
  });
}
