import { hashPassword } from '../utils/password';
import { User } from '../domains/users/User';
import { Ingredient } from '../domains/ingredients/Ingredient';
import { Event } from '../domains/events/Event';
import { EventIngredient } from '../domains/events/EventIngredient';
import { Order } from '../domains/orders/Order';
import { OrderIngredient } from '../domains/orders/OrderIngredient';
import { getSequelize } from './config';

export async function seedDatabase(): Promise<void> {
  const sequelize = getSequelize();
  
  // Import models to ensure they're registered with Sequelize
  // These imports are necessary even if not directly used
  void Order;
  void OrderIngredient;
  
  // Sync database (creates tables if they don't exist)
  await sequelize.sync({ force: true }); // WARNING: This drops all tables!
  
  console.log('Seeding database...');
  
  // Create admin user
  const adminPassword = await hashPassword('admin123');
  await User.create({
    username: 'admin',
    email: 'admin@example.com',
    password: adminPassword,
    isAdmin: true,
  });
  
  // Create regular users
  const userPassword = await hashPassword('user123');
  await User.create({
    username: 'john',
    email: 'john@example.com',
    password: userPassword,
    isAdmin: false,
  });
  
  await User.create({
    username: 'jane',
    email: 'jane@example.com',
    password: userPassword,
    isAdmin: false,
  });
  
  await User.create({
    username: 'bob',
    email: 'bob@example.com',
    password: userPassword,
    isAdmin: false,
  });
  
  // Create ingredients
  const ingredients = await Ingredient.bulkCreate([
    { name: 'Pepperoni' },
    { name: 'Mushrooms' },
    { name: 'Onions' },
    { name: 'Sausage' },
    { name: 'Bacon' },
    { name: 'Extra Cheese' },
    { name: 'Black Olives' },
    { name: 'Green Peppers' },
    { name: 'Pineapple' },
    { name: 'Spinach' },
    { name: 'Tomatoes' },
    { name: 'Ham' },
  ]);
  
  // Create events
  const pastEvent = await Event.create({
    name: 'Halloween Pizza Party',
    date: new Date('2025-10-31'),
    location: 'Main Office, Conference Room B',
  });

  const event1 = await Event.create({
    name: 'Friday Pizza Party',
    date: new Date('2025-11-15'),
    location: 'Main Office, Conference Room A',
  });
  
  const event2 = await Event.create({
    name: 'Sprint Planning Pizza',
    date: new Date('2025-11-20'),
    location: 'Remote (Zoom)',
  });

  // Add ingredients to past event
  await EventIngredient.bulkCreate([
    { eventId: pastEvent.id!, ingredientId: ingredients[0].id! }, // Pepperoni
    { eventId: pastEvent.id!, ingredientId: ingredients[8].id! }, // Pineapple
    { eventId: pastEvent.id!, ingredientId: ingredients[11].id! }, // Ham
  ]);
  
  // Add ingredients to first event
  await EventIngredient.bulkCreate([
    { eventId: event1.id!, ingredientId: ingredients[0].id! }, // Pepperoni
    { eventId: event1.id!, ingredientId: ingredients[1].id! }, // Mushrooms
    { eventId: event1.id!, ingredientId: ingredients[5].id! }, // Extra Cheese
    { eventId: event1.id!, ingredientId: ingredients[7].id! }, // Green Peppers
  ]);
  
  // Add ingredients to second event
  await EventIngredient.bulkCreate([
    { eventId: event2.id!, ingredientId: ingredients[0].id! }, // Pepperoni
    { eventId: event2.id!, ingredientId: ingredients[3].id! }, // Sausage
    { eventId: event2.id!, ingredientId: ingredients[4].id! }, // Bacon
    { eventId: event2.id!, ingredientId: ingredients[5].id! }, // Extra Cheese
  ]);

  // Create orders for Friday Pizza Party (event1)
  const johnOrder1 = await Order.create({
    userId: 2, // john
    eventId: event1.id!,
    size: 'Standard',
  });
  await OrderIngredient.bulkCreate([
    { orderId: johnOrder1.id!, ingredientId: ingredients[0].id! }, // Pepperoni
    { orderId: johnOrder1.id!, ingredientId: ingredients[1].id! }, // Mushrooms
    { orderId: johnOrder1.id!, ingredientId: ingredients[5].id! }, // Extra Cheese
  ]);

  const janeOrder1 = await Order.create({
    userId: 3, // jane
    eventId: event1.id!,
    size: 'Small',
  });
  await OrderIngredient.bulkCreate([
    { orderId: janeOrder1.id!, ingredientId: ingredients[7].id! }, // Green Peppers
    { orderId: janeOrder1.id!, ingredientId: ingredients[1].id! }, // Mushrooms
  ]);

  const bobOrder1 = await Order.create({
    userId: 4, // bob
    eventId: event1.id!,
    size: 'Standard',
  });
  await OrderIngredient.bulkCreate([
    { orderId: bobOrder1.id!, ingredientId: ingredients[0].id! }, // Pepperoni
    { orderId: bobOrder1.id!, ingredientId: ingredients[5].id! }, // Extra Cheese
  ]);

  // Create orders for Sprint Planning Pizza (event2)
  const johnOrder2 = await Order.create({
    userId: 2, // john
    eventId: event2.id!,
    size: 'Standard',
  });
  await OrderIngredient.bulkCreate([
    { orderId: johnOrder2.id!, ingredientId: ingredients[0].id! }, // Pepperoni
    { orderId: johnOrder2.id!, ingredientId: ingredients[3].id! }, // Sausage
    { orderId: johnOrder2.id!, ingredientId: ingredients[4].id! }, // Bacon
    { orderId: johnOrder2.id!, ingredientId: ingredients[5].id! }, // Extra Cheese
  ]);

  const janeOrder2 = await Order.create({
    userId: 3, // jane
    eventId: event2.id!,
    size: 'Small',
  });
  await OrderIngredient.bulkCreate([
    { orderId: janeOrder2.id!, ingredientId: ingredients[0].id! }, // Pepperoni
  ]);

  await Order.create({
    userId: 4, // bob
    eventId: event2.id!,
    size: 'Small',
  });
  // No toppings for Bob's second order

  // Create order for past event
  const johnOrderPast = await Order.create({
    userId: 2, // john
    eventId: pastEvent.id!,
    size: 'Standard',
  });
  await OrderIngredient.bulkCreate([
    { orderId: johnOrderPast.id!, ingredientId: ingredients[8].id! }, // Pineapple
    { orderId: johnOrderPast.id!, ingredientId: ingredients[11].id! }, // Ham
  ]);
  
  console.log('Database seeded successfully!');
  console.log('---');
  console.log('Admin credentials: admin / admin123');
  console.log('User credentials: john / user123, jane / user123, bob / user123');
  console.log('---');
  console.log(`Created ${ingredients.length} ingredients`);
  console.log(`Created 3 events (1 past, 2 upcoming) with topping selections`);
  console.log('Created 7 pizza orders across all events');
}

// Run if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
