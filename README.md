# Domino's Pizza Topping Selection

A full-stack TypeScript web application for managing pizza topping preferences at team pizza dinners.

## Features

### User Features
- **User Registration & Authentication**: Secure user accounts with JWT-based authentication
- **Pizza Dinner Selection**: View scheduled pizza dinners and select toppings for each event
- **Interactive Topping Selection**: Choose from available pizza ingredients with real-time updates
- **Personal Preferences**: Each user maintains their own topping selections per pizza dinner

### Admin Features
- **Pizza Dinner Management**: Create, edit, and delete scheduled pizza dinners
- **Ingredient Management**: Add, modify, and remove available pizza toppings
- **Event Scheduling**: Set dates and times for pizza dinners with descriptions
- **User Selection Overview**: View all user preferences for each pizza dinner

## Technology Stack

### Backend
- **Node.js** with **Express** framework
- **TypeScript** for type safety
- **SQLite** database for data persistence
- **JWT** for authentication
- **bcryptjs** for password hashing

### Frontend
- **React** with **TypeScript**
- **Vite** for fast development and building
- **React Router** for navigation
- **Tailwind CSS** for styling
- **shadcn/ui** components (Radix UI primitives)
- **Lucide React** for icons

## Project Structure

```
dominos/
├── backend/
│   ├── src/
│   │   ├── middleware/     # Auth middleware
│   │   ├── models/         # Database models and types
│   │   ├── routes/         # API endpoints
│   │   └── index.ts        # Express server
│   ├── database.sqlite     # SQLite database
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts
│   │   ├── lib/            # Utilities and API client
│   │   ├── pages/          # Main application pages
│   │   └── types/          # TypeScript type definitions
│   └── package.json
└── package.json           # Root package for scripts
```

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dominos
```

2. Install dependencies:
```bash
npm install
```

3. Start the development servers:
```bash
npm run dev
```

This will start both the backend server (port 3001) and frontend development server (port 5173).

### Production Build

```bash
npm run build
npm start
```

## Default Data

The application comes pre-seeded with:

### Admin Account
- **Username**: admin
- **Password**: admin123

### Available Ingredients
- Pepperoni
- Mushrooms
- Bell Peppers
- Italian Sausage
- Onions
- Black Olives
- Extra Cheese
- Bacon
- Tomatoes
- Spinach

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Admin (Protected)
- `GET /api/admin/pizza-dinners` - List all pizza dinners
- `POST /api/admin/pizza-dinners` - Create pizza dinner
- `PUT /api/admin/pizza-dinners/:id` - Update pizza dinner
- `DELETE /api/admin/pizza-dinners/:id` - Delete pizza dinner
- `GET /api/admin/ingredients` - List all ingredients
- `POST /api/admin/ingredients` - Create ingredient
- `PUT /api/admin/ingredients/:id` - Update ingredient
- `DELETE /api/admin/ingredients/:id` - Delete ingredient

### User (Protected)
- `GET /api/user/selections/:pizzaDinnerId` - Get user's selections
- `PUT /api/user/selections` - Update user's selections
- `GET /api/user/pizza-dinners/:id/selections` - Get all selections (admin only)

## Usage

### For Regular Users
1. Register for an account or sign in
2. Browse scheduled pizza dinners
3. Select a pizza dinner to view available toppings
4. Choose your preferred toppings
5. Save your selections

### For Administrators
1. Sign in with admin credentials
2. Access the Admin Panel
3. Create and manage pizza dinners
4. Add or modify available ingredients
5. View user preferences for each event

## License

MIT License - see LICENSE file for details
