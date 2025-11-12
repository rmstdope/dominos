# Backend Development Guidelines

This document provides AI agents with specific guidelines for working with the backend codebase.

## Project Structure

The backend follows a **domain-driven structure** organized by business domains rather than technical layers:

```
backend/
├── src/
│   ├── domains/           # Business domain models
│   │   ├── users/         # User authentication and management
│   │   ├── ingredients/   # Pizza ingredients
│   │   └── events/        # Pizza events and event-ingredient associations
│   ├── routes/            # API route handlers
│   ├── middleware/        # Express middleware (auth, etc.)
│   ├── utils/             # Utility functions (JWT, password hashing)
│   ├── database/          # Database configuration
│   ├── types/             # TypeScript type definitions
│   └── server.ts          # Express app setup
└── tests/
    ├── models/            # Model unit tests
    ├── routes/            # Route integration tests
    ├── middleware/        # Middleware tests
    ├── utils/             # Utility function tests
    └── integration/       # Full integration tests
```

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js 4.19.2
- **Database**: SQLite with Sequelize ORM 6.37.7
- **Authentication**: JWT with HTTP-only cookies, bcrypt for password hashing
- **Testing**: Jest 29.7.0 with Supertest for API testing
- **Development**: tsx for hot reload, TypeScript 5.4.5+

## Code Organization Principles

### Domain Models

All domain models follow a consistent pattern:

1. **Location**: `src/domains/<domain-name>/`
2. **Naming**: PascalCase (e.g., `User.ts`, `Event.ts`, `EventIngredient.ts`)
3. **Pattern**:

   ```typescript
   import { Model, DataTypes } from "sequelize";
   import { getSequelize } from "../../database/config";

   export class ModelName extends Model {
     declare id: number;
     declare field: type;
     declare readonly createdAt: Date;
     declare readonly updatedAt: Date;
   }

   ModelName.init(
     {
       // field definitions
     },
     {
       sequelize: getSequelize(),
       tableName: "table_name",
       timestamps: true,
     }
   );
   ```

4. **Validations**: Use Sequelize built-in validators (`notEmpty`, `len`, `unique`, etc.)
5. **Avoid DOM conflicts**: When model names conflict with DOM types (e.g., `Event`), use aliased imports: `import { Event as EventModel } from '...'`

### API Routes

1. **Location**: `src/routes/`
2. **Naming**: Descriptive names like `admin.ts`, `auth.ts`
3. **Pattern**:

   - Use Express Router
   - Apply middleware in route definition: `router.get('/path', authenticate, requireAdmin, handler)`
   - Use async handlers with try-catch blocks
   - Return explicit Promise<void> for handlers that use early returns
   - Always validate input before processing
   - Use descriptive HTTP status codes (200, 201, 400, 401, 403, 404, 409, 500)
   - Use consistent error message format: `{ error: 'Message' }`

4. **Endpoint Structure**:

   ```typescript
   router.method(
     "/path",
     authenticate,
     requireAdmin,
     async (req: Request, res: Response): Promise<void> => {
       try {
         // 1. Validate input
         if (!requiredField) {
           res.status(400).json({ error: "Field is required" });
           return;
         }

         // 2. Check authorization/existence
         const resource = await Model.findByPk(id);
         if (!resource) {
           res.status(404).json({ error: "Resource not found" });
           return;
         }

         // 3. Perform operation
         // 4. Return response
         res.status(200).json(result);
       } catch (error) {
         console.error("Error description:", error);
         res.status(500).json({ error: "Internal server error" });
       }
     }
   );
   ```

### Authentication & Authorization

1. **Middleware**: Use `authenticate` for requiring login, `requireAdmin` for admin-only routes
2. **Authentication**: JWT tokens stored in HTTP-only cookies
3. **Pattern**: Chain middleware in route definitions: `authenticate, requireAdmin`
4. **User context**: Authenticated user available as `req.user` (added by authenticate middleware)

### Testing

1. **Test-Driven Development (TDD)**: Write tests before implementation (Red-Green-Refactor)
2. **Test Organization**:

   - Model tests in `tests/models/`
   - Route tests in `tests/routes/`
   - Middleware tests in `tests/middleware/`
   - Utility tests in `tests/utils/`

3. **Test Structure**:

   ```typescript
   describe("Feature", () => {
     beforeAll(async () => {
       // Setup (sync database)
     });

     beforeEach(async () => {
       // Clean state (destroy all records in proper order to respect foreign keys)
     });

     afterAll(async () => {
       // Cleanup (close database)
     });

     describe("Specific Behavior", () => {
       it("should do something", async () => {
         // Arrange, Act, Assert
       });
     });
   });
   ```

4. **Test Helpers**: Create reusable helper functions to reduce duplication (e.g., `createUserWithToken`)
5. **Avoid `any` type**: Use type assertions like `as unknown as Type` instead of `as any`
6. **Foreign Key Ordering**: When clearing database in tests, delete child records before parent records (e.g., `EventIngredient` before `Event` or `Ingredient`)

### Database

1. **Configuration**: Use `getSequelize()` from `database/config.ts`
2. **Environments**:
   - Development/Production: SQLite file (`data/database.sqlite`)
   - Testing: In-memory SQLite (`:memory:`)
3. **Migrations**: Not currently used; models sync automatically
4. **Transactions**: Not extensively used; may be needed for complex operations

### Validation & Error Handling

1. **Input Validation**: Validate all inputs at the route handler level
2. **Model Validation**: Use Sequelize validators for field constraints
3. **Error Responses**: Consistent format `{ error: 'Description' }` with appropriate HTTP status
4. **Error Logging**: Use `console.error()` with descriptive messages
5. **Try-Catch**: Wrap all async operations in try-catch blocks

### Naming Conventions

1. **Files**: camelCase for utilities, PascalCase for models
2. **Classes/Models**: PascalCase (e.g., `User`, `EventIngredient`)
3. **Functions/Variables**: camelCase (e.g., `getUserById`, `eventId`)
4. **Constants**: UPPER_SNAKE_CASE (e.g., `JWT_SECRET`)
5. **Interfaces**: PascalCase with descriptive names (e.g., `UserAttributes`)
6. **Routes**: kebab-case in URLs (e.g., `/api/admin/event-ingredients`)

### Code Quality

1. **Linting**: Run `npm run lint` before committing; fix all errors AND warnings
2. **TypeScript**: Use strict typing; avoid `any` type
3. **Formatting**: Consistent style enforced by ESLint
4. **Testing**: All tests must pass (`npm test`)
5. **Coverage**: Aim for comprehensive test coverage

### API Endpoints Pattern

Current API structure:

- **Authentication**: `/api/auth/*`

  - POST `/register` - User registration
  - POST `/login` - User login
  - POST `/logout` - User logout
  - GET `/me` - Get current user

- **Admin Users**: `/api/admin/users`

  - GET `/` - List all users (admin only)
  - PATCH `/:id` - Update user admin status (admin only)

- **Admin Ingredients**: `/api/admin/ingredients`

  - GET `/` - List all ingredients (admin only)
  - POST `/` - Create ingredient (admin only)
  - DELETE `/:id` - Delete ingredient (admin only)

- **Admin Events**: `/api/admin/events`

  - GET `/` - List all events (admin only)
  - POST `/` - Create event (admin only)
  - DELETE `/:id` - Delete event (admin only)

- **Admin Event-Ingredients**: `/api/admin/events/:eventId/ingredients`
  - GET `/` - List ingredients for an event (admin only)
  - POST `/` - Add ingredient to event (admin only)
  - DELETE `/:ingredientId` - Remove ingredient from event (admin only)

### Common Patterns

1. **Preventing Duplicates**: Check for existing records before creation, return 409 Conflict
2. **Resource Not Found**: Return 404 with descriptive error message
3. **Validation Errors**: Return 400 with field-specific error messages
4. **Trimming Input**: Always trim string inputs before saving
5. **Sorting Results**: Use Sequelize `order` option for consistent ordering
6. **Composite Keys**: Use multiple primary keys for junction tables (e.g., EventIngredient)

### Development Workflow

1. **Write Test First** (Red): Create failing test
2. **Implement Minimum Code** (Green): Make test pass
3. **Refactor**: Clean up code while keeping tests green
4. **Get Review**: Let navigator review before proceeding
5. **Run Linting**: Ensure no linting errors or warnings
6. **Run All Tests**: Ensure no regressions
7. **Update API Documentation**: When any API endpoint is added, modified, or removed, update the `API.md` file to reflect the changes

### API Documentation

The `API.md` file contains comprehensive documentation of all API endpoints. This file **MUST be kept in sync** with the actual implementation:

- **When adding a new endpoint**: Document the route, method, request body, response, and all possible error codes
- **When modifying an endpoint**: Update the corresponding documentation with new request/response formats, validation rules, or status codes
- **When removing an endpoint**: Remove the documentation for that endpoint
- **When changing validation**: Update the validation requirements in the documentation
- **When changing error responses**: Update the error response examples and status codes

The API documentation is a critical part of the codebase and must always reflect the current state of the API.

### Special Considerations

1. **Event Model Naming**: Imported as `EventModel` to avoid conflict with DOM `Event` type
2. **Password Hashing**: Use bcrypt utility functions, never store plain passwords
3. **JWT Secrets**: Load from environment variables via dotenv
4. **HTTP-Only Cookies**: Authentication tokens must use `httpOnly: true`
5. **CORS**: Configured for development, adjust for production
6. **TypeScript Strict Mode**: Project uses strict TypeScript settings

### What NOT to Do

1. ❌ Don't use `any` type (use `unknown` with type assertions if needed)
2. ❌ Don't create manual migration files (models auto-sync)
3. ❌ Don't skip input validation in route handlers
4. ❌ Don't ignore linting warnings (fix them all)
5. ❌ Don't write implementation before tests (follow TDD)
6. ❌ Don't use magic numbers or strings (define constants)
7. ❌ Don't skip error handling in async functions
8. ❌ Don't delete parent records before child records in tests
9. ❌ Don't expose sensitive data (passwords, full error stacks) in API responses
10. ❌ Don't proceed without navigator review after each TDD step
