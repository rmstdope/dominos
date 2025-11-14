import dotenv from 'dotenv';
import { createApp } from './server';
import { getSequelize } from './database/config';
import { User } from './domains/users/User';
import { hashPassword } from './utils/password';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

async function ensureAdminUser() {
  try {
    // Check if any admin user exists
    const adminCount = await User.count({ where: { isAdmin: true } });
    
    if (adminCount === 0) {
      console.log('No admin user found. Creating default admin user...');
      
      const hashedPassword = await hashPassword('admin123');
      await User.create({
        username: 'admin',
        email: 'admin@dominos.local',
        password: hashedPassword,
        isAdmin: true,
      });
      
      console.log('Default admin user created successfully.');
      console.log('Username: admin');
      console.log('Password: admin123');
      console.log('⚠️  IMPORTANT: Please change this password immediately!');
    }
  } catch (error) {
    console.error('Error ensuring admin user exists:', error);
    // Don't throw - we want the server to start even if this fails
  }
}

async function startServer() {
  try {
    // Initialize database connection and sync schema
    const sequelize = getSequelize();
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync database schema (creates tables if they don't exist)
    await sequelize.sync({ alter: false });
    console.log('Database schema synced.');

    // Ensure at least one admin user exists
    await ensureAdminUser();

    const app = createApp();

    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Database: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(async () => {
        console.log('HTTP server closed');
        await sequelize.close();
        console.log('Database connection closed');
      });
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT signal received: closing HTTP server');
      server.close(async () => {
        console.log('HTTP server closed');
        await sequelize.close();
        console.log('Database connection closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
