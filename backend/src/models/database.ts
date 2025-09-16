import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';

class Database {
  private db: sqlite3.Database;

  constructor() {
    const dbPath = path.join(__dirname, '../../database.sqlite');
    this.db = new sqlite3.Database(dbPath);
    this.init();
  }

  private async init() {
    await this.createTables();
    await this.seedData();
  }

  private createTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Users table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            is_admin BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Ingredients table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS ingredients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            is_available BOOLEAN DEFAULT TRUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Pizza dinners table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS pizza_dinners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            scheduled_date DATETIME NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // User selections table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS user_selections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            pizza_dinner_id INTEGER NOT NULL,
            ingredient_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (pizza_dinner_id) REFERENCES pizza_dinners (id),
            FOREIGN KEY (ingredient_id) REFERENCES ingredients (id),
            UNIQUE(user_id, pizza_dinner_id, ingredient_id)
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  private async seedData(): Promise<void> {
    // Check if we already have data
    const userCount = await this.get('SELECT COUNT(*) as count FROM users');
    if (userCount.count > 0) return;

    // Create admin user
    const bcrypt = require('bcryptjs');
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    await this.run(
      'INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, ?)',
      ['admin', 'admin@dominos.com', adminPassword, true]
    );

    // Seed default ingredients
    const ingredients = [
      { name: 'Pepperoni', description: 'Classic spicy pepperoni slices' },
      { name: 'Mushrooms', description: 'Fresh button mushrooms' },
      { name: 'Bell Peppers', description: 'Colorful bell peppers' },
      { name: 'Italian Sausage', description: 'Seasoned Italian sausage' },
      { name: 'Onions', description: 'Fresh red onions' },
      { name: 'Black Olives', description: 'Mediterranean black olives' },
      { name: 'Extra Cheese', description: 'Additional mozzarella cheese' },
      { name: 'Bacon', description: 'Crispy bacon bits' },
      { name: 'Tomatoes', description: 'Fresh diced tomatoes' },
      { name: 'Spinach', description: 'Fresh baby spinach leaves' }
    ];

    for (const ingredient of ingredients) {
      await this.run(
        'INSERT INTO ingredients (name, description) VALUES (?, ?)',
        [ingredient.name, ingredient.description]
      );
    }
  }

  run(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export default new Database();