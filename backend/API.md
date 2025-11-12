# Domino's Pizza Toppings API Documentation

Base URL: `http://localhost:3000`

## Authentication

The API uses JWT tokens stored in HTTP-only cookies. After login, the token is automatically sent with each request.

### Authentication Headers

- Credentials must be included in requests: `credentials: 'include'`
- Content-Type for POST/PATCH requests: `application/json`

---

## Public Endpoints

### Health Check

#### GET /health

Returns server status.

**Response:** `200 OK`

```json
{
  "status": "ok",
  "timestamp": "2025-11-12T00:00:00.000Z",
  "service": "dominos-backend"
}
```

### Root

#### GET /

Returns API information.

**Response:** `200 OK`

```json
{
  "message": "Domino's Pizza Toppings API",
  "version": "1.0.0"
}
```

### Events

#### GET /api/events

List all events for public access.

**Authentication:** Not required

**Response:** `200 OK`

```json
{
  "events": [
    {
      "id": 1,
      "name": "Friday Pizza Party",
      "date": "2025-11-15T00:00:00.000Z",
      "location": "Main Office, Conference Room A"
    },
    {
      "id": 2,
      "name": "Sprint Planning Pizza",
      "date": "2025-11-20T00:00:00.000Z",
      "location": "Remote (Zoom)"
    }
  ]
}
```

**Note:** Results are ordered by date ascending (earliest first).

**Error Responses:**

- `500 Internal Server Error`: Server error

---

## Authentication Endpoints

Base path: `/api/auth`

### Register

#### POST /api/auth/register

Create a new user account.

**Request Body:**

```json
{
  "username": "string (3-50 chars, required)",
  "email": "string (valid email, required)",
  "password": "string (required)"
}
```

**Response:** `201 Created`

```json
{
  "user": {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "isAdmin": false,
    "createdAt": "2025-11-12T00:00:00.000Z",
    "updatedAt": "2025-11-12T00:00:00.000Z"
  }
}
```

**Cookie Set:** `token` (HTTP-only, 7 days expiration)

**Error Responses:**

- `400 Bad Request`: Missing required fields
- `400 Bad Request`: Username or email already exists
- `500 Internal Server Error`: Server error

---

### Login

#### POST /api/auth/login

Authenticate a user.

**Request Body:**

```json
{
  "username": "string (required)",
  "password": "string (required)"
}
```

**Response:** `200 OK`

```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "isAdmin": true,
    "createdAt": "2025-11-12T00:00:00.000Z",
    "updatedAt": "2025-11-12T00:00:00.000Z"
  }
}
```

**Cookie Set:** `token` (HTTP-only, 7 days expiration)

**Error Responses:**

- `400 Bad Request`: Missing required fields
- `401 Unauthorized`: Invalid credentials
- `500 Internal Server Error`: Server error

---

### Logout

#### POST /api/auth/logout

Log out the current user.

**Response:** `200 OK`

```json
{
  "message": "Logged out successfully"
}
```

**Cookie Cleared:** `token`

---

### Get Current User

#### GET /api/auth/me

Get the currently authenticated user's information.

**Authentication:** Required

**Response:** `200 OK`

```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "isAdmin": true,
    "createdAt": "2025-11-12T00:00:00.000Z",
    "updatedAt": "2025-11-12T00:00:00.000Z"
  }
}
```

**Error Responses:**

- `401 Unauthorized`: Not authenticated
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

---

## Admin Endpoints

Base path: `/api/admin`

**Authentication:** All admin endpoints require authentication and admin privileges.

### Users Management

#### GET /api/admin/users

List all users with their admin status.

**Response:** `200 OK`

```json
{
  "users": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "isAdmin": true
    },
    {
      "id": 2,
      "username": "john",
      "email": "john@example.com",
      "isAdmin": false
    }
  ]
}
```

**Error Responses:**

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin
- `500 Internal Server Error`: Server error

---

#### PATCH /api/admin/users/:id

Grant or revoke admin privileges for a user.

**URL Parameters:**

- `id`: User ID (integer)

**Request Body:**

```json
{
  "isAdmin": true
}
```

**Response:** `200 OK`

```json
{
  "id": 2,
  "username": "john",
  "email": "john@example.com",
  "isAdmin": true
}
```

**Error Responses:**

- `400 Bad Request`: isAdmin field is required
- `400 Bad Request`: isAdmin must be a boolean
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

---

### Ingredients Management

#### GET /api/admin/ingredients

List all available pizza ingredients.

**Response:** `200 OK`

```json
{
  "ingredients": [
    {
      "id": 1,
      "name": "Pepperoni"
    },
    {
      "id": 2,
      "name": "Mushrooms"
    }
  ]
}
```

**Note:** Results are ordered alphabetically by name.

**Error Responses:**

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin
- `500 Internal Server Error`: Server error

---

#### POST /api/admin/ingredients

Add a new ingredient.

**Request Body:**

```json
{
  "name": "string (1-100 chars, required)"
}
```

**Response:** `201 Created`

```json
{
  "id": 13,
  "name": "Olives",
  "createdAt": "2025-11-12T00:00:00.000Z",
  "updatedAt": "2025-11-12T00:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: Name is required
- `400 Bad Request`: Name cannot be empty
- `400 Bad Request`: Name must be between 1 and 100 characters
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin
- `409 Conflict`: Ingredient already exists
- `500 Internal Server Error`: Server error

---

#### DELETE /api/admin/ingredients/:id

Delete an ingredient.

**URL Parameters:**

- `id`: Ingredient ID (integer)

**Response:** `204 No Content`

**Error Responses:**

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin
- `404 Not Found`: Ingredient not found
- `500 Internal Server Error`: Server error

---

### Events Management

#### GET /api/admin/events

List all pizza events.

**Response:** `200 OK`

```json
{
  "events": [
    {
      "id": 2,
      "name": "Sprint Planning Pizza",
      "date": "2025-11-20T00:00:00.000Z",
      "location": "Remote (Zoom)"
    },
    {
      "id": 1,
      "name": "Friday Pizza Party",
      "date": "2025-11-15T00:00:00.000Z",
      "location": "Main Office, Conference Room A"
    }
  ]
}
```

**Note:** Results are ordered by date descending (newest first).

**Error Responses:**

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin
- `500 Internal Server Error`: Server error

---

#### POST /api/admin/events

Create a new event.

**Request Body:**

```json
{
  "name": "string (required, trimmed)",
  "date": "ISO 8601 date string (required)",
  "location": "string (required, trimmed)"
}
```

**Example:**

```json
{
  "name": "Team Pizza Dinner",
  "date": "2025-12-01T18:00:00.000Z",
  "location": "Downtown Office"
}
```

**Response:** `201 Created`

```json
{
  "id": 3,
  "name": "Team Pizza Dinner",
  "date": "2025-12-01T18:00:00.000Z",
  "location": "Downtown Office",
  "createdAt": "2025-11-12T00:00:00.000Z",
  "updatedAt": "2025-11-12T00:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: Name is required
- `400 Bad Request`: Date is required
- `400 Bad Request`: Location is required
- `400 Bad Request`: Invalid date format
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin
- `500 Internal Server Error`: Server error

---

#### DELETE /api/admin/events/:id

Delete an event.

**URL Parameters:**

- `id`: Event ID (integer)

**Response:** `204 No Content`

**Error Responses:**

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin
- `404 Not Found`: Event not found
- `500 Internal Server Error`: Server error

---

### Event-Ingredients Management

#### GET /api/admin/events/:eventId/ingredients

List all ingredients selected for a specific event.

**URL Parameters:**

- `eventId`: Event ID (integer)

**Response:** `200 OK`

```json
[
  {
    "id": 1,
    "name": "Pepperoni"
  },
  {
    "id": 6,
    "name": "Extra Cheese"
  }
]
```

**Note:** Results are ordered alphabetically by name. Returns empty array if no ingredients.

**Error Responses:**

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin
- `404 Not Found`: Event not found
- `500 Internal Server Error`: Server error

---

#### POST /api/admin/events/:eventId/ingredients

Add an ingredient to an event.

**URL Parameters:**

- `eventId`: Event ID (integer)

**Request Body:**

```json
{
  "ingredientId": 1
}
```

**Response:** `201 Created`

```json
{
  "eventId": 1,
  "ingredientId": 1,
  "createdAt": "2025-11-12T00:00:00.000Z",
  "updatedAt": "2025-11-12T00:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: ingredientId is required
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin
- `404 Not Found`: Event not found
- `404 Not Found`: Ingredient not found
- `409 Conflict`: Ingredient already added to this event
- `500 Internal Server Error`: Server error

---

#### DELETE /api/admin/events/:eventId/ingredients/:ingredientId

Remove an ingredient from an event.

**URL Parameters:**

- `eventId`: Event ID (integer)
- `ingredientId`: Ingredient ID (integer)

**Response:** `204 No Content`

**Error Responses:**

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin
- `404 Not Found`: Event not found
- `404 Not Found`: Ingredient not found
- `404 Not Found`: Ingredient not found in this event
- `500 Internal Server Error`: Server error

---

## Data Models

### User

```typescript
{
  id: number;
  username: string; // 3-50 characters, unique
  email: string; // valid email, unique
  password: string; // bcrypt hashed, never returned
  isAdmin: boolean; // default: false
  createdAt: Date;
  updatedAt: Date;
}
```

### Ingredient

```typescript
{
  id: number;
  name: string; // 1-100 characters, unique
  createdAt: Date;
  updatedAt: Date;
}
```

### Event

```typescript
{
  id: number;
  name: string; // 1-255 characters
  date: Date;
  location: string; // 1-255 characters
  createdAt: Date;
  updatedAt: Date;
}
```

### EventIngredient

```typescript
{
  eventId: number; // foreign key to Event
  ingredientId: number; // foreign key to Ingredient
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes

- `200 OK`: Successful GET request
- `201 Created`: Successful POST request creating a resource
- `204 No Content`: Successful DELETE request
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: Authenticated but lacks permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `500 Internal Server Error`: Server error

---

## CORS Configuration

The API is configured to accept requests from:

- Origin: `http://localhost:5173`
- Credentials: Enabled

---

## Environment Variables

Required environment variables:

```env
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d
NODE_ENV=development
PORT=3000
```

---

## Database Seeding

To seed the development database with test data:

```bash
cd backend
npm run seed
```

This creates:

- 1 admin user: `admin` / `admin123`
- 3 regular users: `john`, `jane`, `bob` / `user123`
- 12 pizza ingredients
- 2 events with pre-selected toppings
