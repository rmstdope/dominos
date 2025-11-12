# Frontend Development Guidelines

This document provides AI agents with specific guidelines for working with the frontend codebase.

## Project Structure

The frontend follows a **feature-based structure** with clear separation of concerns:

```
frontend/
├── src/
│   ├── pages/             # Page components (one per route)
│   ├── components/        # Reusable UI components
│   ├── contexts/          # React Context providers
│   ├── assets/            # Static assets
│   └── test/              # Test files
├── public/                # Public static files
└── coverage/              # Test coverage reports
```

## Technology Stack

- **Runtime**: React 19.2.0 with TypeScript 5.9.3
- **Build Tool**: Vite 7.2.2
- **Routing**: React Router DOM 7.9.5
- **UI Library**: Radix UI Themes 3.2.1 + Radix UI Icons 1.3.2
- **Testing**: Vitest 4.0.8 with React Testing Library 16.3.0
- **User Interactions**: @testing-library/user-event 14.6.1
- **Linting**: ESLint 9.39.1 (flat config)
- **Type Checking**: TypeScript strict mode

## Code Organization Principles

### Pages

1. **Location**: `src/pages/`
2. **Naming**: PascalCase with "Page" suffix (e.g., `LoginPage.tsx`, `UsersPage.tsx`)
3. **Export**: Default export
4. **Pattern**:

   ```typescript
   import { useState, useEffect } from 'react';
   import { Radix UI components } from '@radix-ui/themes';
   import { Icons } from '@radix-ui/react-icons';

   interface DataType {
     id: number;
     // ... fields
   }

   export default function PageName() {
     const [data, setData] = useState<DataType[]>([]);
     const [isLoading, setIsLoading] = useState(true);
     const [error, setError] = useState<string | null>(null);

     useEffect(() => {
       fetchData();
     }, []);

     async function fetchData() {
       try {
         setIsLoading(true);
         setError(null);

         const response = await fetch('http://localhost:3000/api/...', {
           credentials: 'include',
         });

         if (!response.ok) {
           throw new Error('Failed to load data');
         }

         const result = await response.json();
         setData(result.data);
       } catch (err) {
         setError(err instanceof Error ? err.message : 'Error message');
       } finally {
         setIsLoading(false);
       }
     }

     if (isLoading) {
       return <Text>Loading...</Text>;
     }

     if (error) {
       return <Callout.Root color="red">...</Callout.Root>;
     }

     return (
       // JSX
     );
   }
   ```

### Components

1. **Location**: `src/components/`
2. **Naming**: PascalCase without suffix (e.g., `AdminLayout.tsx`, `ProtectedRoute.tsx`)
3. **Export**: Named export
4. **Props Interface**: Define TypeScript interface with "Props" suffix
5. **Pattern**:

   ```typescript
   import { type ReactNode } from 'react';
   import { Radix UI components } from '@radix-ui/themes';

   interface ComponentNameProps {
     children: ReactNode;
     optionalProp?: string;
   }

   export function ComponentName({ children, optionalProp }: ComponentNameProps) {
     return (
       // JSX
     );
   }
   ```

### Contexts

1. **Location**: `src/contexts/`
2. **Naming**: PascalCase with "Context" suffix (e.g., `AuthContext.tsx`)
3. **Pattern**: Export both Provider component and custom hook
4. **Structure**:

   ```typescript
   import { createContext, useContext, useState, type ReactNode } from "react";

   // Disable react-refresh lint for contexts that export hook + component
   /* eslint-disable react-refresh/only-export-components */

   interface ContextDataType {
     // ... shape of context data
   }

   interface ContextType {
     data: ContextDataType | null;
     isLoading: boolean;
     actions: () => void;
   }

   const SomeContext = createContext<ContextType | undefined>(undefined);

   interface ProviderProps {
     children: ReactNode;
   }

   export function SomeProvider({ children }: ProviderProps) {
     const [state, setState] = useState<ContextDataType | null>(null);
     const [isLoading, setIsLoading] = useState(true);

     // Context logic

     return (
       <SomeContext.Provider value={{ data: state, isLoading, actions }}>
         {children}
       </SomeContext.Provider>
     );
   }

   export function useSome() {
     const context = useContext(SomeContext);
     if (context === undefined) {
       throw new Error("useSome must be used within a SomeProvider");
     }
     return context;
   }
   ```

### Routing

1. **Configuration**: All routes defined in `App.tsx`
2. **Route Structure**:
   - Public routes: Direct route elements
   - Protected routes: Wrapped in `<ProtectedRoute>` component
   - Admin routes: Wrapped in `<ProtectedRoute requireAdmin>` and `<AdminLayout>`
3. **Pattern**:

   ```typescript
   <Route path="/public" element={<PublicPage />} />
   <Route
     path="/protected"
     element={
       <ProtectedRoute>
         <ProtectedPage />
       </ProtectedRoute>
     }
   />
   <Route
     path="/admin/resource"
     element={
       <ProtectedRoute requireAdmin>
         <AdminLayout>
           <ResourcePage />
         </AdminLayout>
       </ProtectedRoute>
     }
   />
   ```

### API Communication

1. **API Documentation**: Always consult `backend/API.md` for the latest API endpoints, request/response formats, and authentication requirements before implementing any backend communication
2. **Base URL**: `http://localhost:3000` (hardcoded for now)
3. **Credentials**: Always include `credentials: 'include'` for cookie-based auth
4. **Error Handling**: Use try-catch with specific error messages
5. **HTTP Methods**: Use appropriate methods (GET, POST, PATCH, DELETE)
6. **Response Format**: Expect `{ data }` or `{ error }` format
7. **Pattern**:

   ```typescript
   const response = await fetch("http://localhost:3000/api/endpoint", {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
     },
     credentials: "include",
     body: JSON.stringify({ field: value }),
   });

   if (!response.ok) {
     if (response.status === 401) {
       // Handle unauthorized
     } else if (response.status === 404) {
       // Handle not found
     } else {
       throw new Error("Generic error");
     }
   }

   const data = await response.json();
   ```

### State Management

1. **Local State**: Use `useState` for component-level state
2. **Global State**: Use React Context (AuthContext pattern)
3. **Loading States**: Always track with `isLoading` boolean
4. **Error States**: Use `error: string | null` pattern
5. **Initial State**: Set appropriate initial values (`[]` for arrays, `null` for objects, `true` for initial loading)

### Testing

1. **Test-Driven Development (TDD)**: Write tests before implementation (Red-Green-Refactor)
2. **Test Location**: `src/test/` directory
3. **Test Naming**: Match source file with `.test.tsx` extension
4. **Coverage Requirement**: 80% minimum (branches, functions, lines, statements)
5. **Test Structure**:

   ```typescript
   import { describe, it, expect, beforeEach, vi } from "vitest";
   import { render, screen, waitFor } from "@testing-library/react";
   import userEvent from "@testing-library/user-event";
   import { MemoryRouter } from "react-router-dom";
   import { AuthProvider } from "../contexts/AuthContext";
   import ComponentUnderTest from "../pages/ComponentUnderTest";

   describe("ComponentUnderTest", () => {
     beforeEach(() => {
       // Mock fetch
       window.fetch = vi.fn((url) => {
         if (typeof url === "string" && url.includes("/api/auth/me")) {
           return Promise.resolve({
             ok: true,
             json: async () => ({
               user: { id: 1, username: "admin", isAdmin: true },
             }),
           } as Response);
         }
         return Promise.resolve({ ok: false } as Response);
       }) as typeof window.fetch;
     });

     it("should render component", async () => {
       render(
         <MemoryRouter>
           <AuthProvider>
             <ComponentUnderTest />
           </AuthProvider>
         </MemoryRouter>
       );

       await waitFor(() => {
         expect(screen.getByText(/expected text/i)).toBeInTheDocument();
       });
     });

     it("should handle user interaction", async () => {
       const user = userEvent.setup();

       render(
         <MemoryRouter>
           <AuthProvider>
             <ComponentUnderTest />
           </AuthProvider>
         </MemoryRouter>
       );

       const button = screen.getByRole("button", { name: /click me/i });
       await user.click(button);

       await waitFor(() => {
         expect(screen.getByText(/result/i)).toBeInTheDocument();
       });
     });
   });
   ```

6. **Test Helpers**:

   - Always wrap components in `<MemoryRouter>` for router-dependent components
   - Always wrap in `<AuthProvider>` for auth-dependent components
   - Use `waitFor` for async operations
   - Mock `window.fetch` in `beforeEach`
   - Use `userEvent` for user interactions (not `fireEvent`)

7. **Coverage Exclusions**:
   - `src/test/` directory
   - Config files (`*.config.ts`)
   - `main.tsx` (entry point)
   - CSS and SVG files
   - `App.tsx` (routing configuration tested via integration)

### UI Components & Styling

1. **UI Library**: Radix UI Themes for all UI components
2. **Component Imports**: Import from `@radix-ui/themes` and `@radix-ui/react-icons`
3. **Common Components**:

   - `Box`, `Flex`, `Container` for layout
   - `Text`, `Heading` for typography
   - `Button`, `TextField`, `Switch` for inputs
   - `Table` for data display
   - `Card` for content grouping
   - `Callout` for alerts/errors
   - `Badge` for status indicators

4. **Icons**: Use Radix UI Icons (e.g., `ExclamationTriangleIcon`, `TrashIcon`, `PlusIcon`)

5. **Styling**:

   - Use inline `style` prop for custom styles
   - Use Radix UI props (`size`, `weight`, `color`, `variant`)
   - Access CSS variables: `var(--gray-5)`, `var(--gray-a3)`
   - Use `cursor: 'pointer'` on clickable elements

6. **Theme**: Wrap entire app in `<Theme>` component from `@radix-ui/themes`

### Form Handling

1. **Form State**: Track input values, errors, and loading state separately
2. **Validation**: Client-side validation before API calls
3. **Error Display**: Use `Callout` component for general errors, inline text for field errors
4. **Pattern**:

   ```typescript
   const [fieldValue, setFieldValue] = useState("");
   const [validationErrors, setValidationErrors] = useState<
     Record<string, string>
   >({});
   const [error, setError] = useState<string | null>(null);
   const [isLoading, setIsLoading] = useState(false);

   async function handleSubmit(e: FormEvent) {
     e.preventDefault();

     // Validate
     const errors: Record<string, string> = {};
     if (!fieldValue.trim()) {
       errors.field = "Field is required";
     }

     if (Object.keys(errors).length > 0) {
       setValidationErrors(errors);
       return;
     }

     // Submit
     try {
       setIsLoading(true);
       setError(null);
       setValidationErrors({});

       // API call
     } catch (err) {
       setError(err instanceof Error ? err.message : "Error");
     } finally {
       setIsLoading(false);
     }
   }

   function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
     setFieldValue(e.target.value);
     setError(null);
     setValidationErrors({});
   }
   ```

### TypeScript Conventions

1. **Type Imports**: Use `type` keyword for type-only imports: `import { type ReactNode } from 'react'`
2. **Interface Naming**: Descriptive names (e.g., `User`, `Ingredient`, `AuthContextType`)
3. **Props Interfaces**: Name with "Props" suffix (e.g., `ProtectedRouteProps`)
4. **Avoid `any`**: Never use `any` type; use `unknown` or proper types
5. **Event Types**: Import from React (e.g., `FormEvent`, `ChangeEvent<HTMLInputElement>`)
6. **Null vs Undefined**: Use `null` for intentional absence, `undefined` for optional parameters

### Naming Conventions

1. **Files**: PascalCase for components/pages (e.g., `LoginPage.tsx`)
2. **Components/Pages**: PascalCase (e.g., `AdminLayout`, `UsersPage`)
3. **Functions**: camelCase (e.g., `fetchData`, `handleSubmit`)
4. **Variables**: camelCase (e.g., `isLoading`, `userData`)
5. **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
6. **Interfaces**: PascalCase (e.g., `User`, `AdminLayoutProps`)
7. **Event Handlers**: Prefix with "handle" (e.g., `handleClick`, `handleSubmit`)

### Code Quality

1. **Linting**: Run `npm run lint` before committing; fix all errors AND warnings
2. **TypeScript**: Use strict typing; no `any` types
3. **Testing**: All tests must pass (`npm test`)
4. **Coverage**: Maintain 80% minimum coverage on all metrics
5. **Build**: Ensure production build succeeds (`npm run build`)
6. **Formatting**: Consistent style enforced by ESLint

### Authentication Flow

1. **Context**: `AuthContext` provides `user`, `isLoading`, `login()`, `logout()`
2. **Session Check**: On app mount, check `/api/auth/me` endpoint
3. **Login**: Call `login(username, password)` which calls `/api/auth/login`
4. **Logout**: Call `logout()` which calls `/api/auth/logout`
5. **Protected Routes**: Use `<ProtectedRoute>` component with optional `requireAdmin` prop
6. **Cookie-based**: Authentication uses HTTP-only cookies (automatic)

### Current Application Structure

**Public Routes:**

- `/login` - LoginPage (authentication form)

**Protected Routes (Admin Only):**

- `/admin` - Dashboard (placeholder)
- `/admin/users` - UsersPage (user management, toggle admin status)
- `/admin/ingredients` - IngredientsPage (CRUD operations)
- `/admin/events` - EventsPage (placeholder for Issue #10)

**Contexts:**

- `AuthContext` - User authentication state and operations

**Components:**

- `ProtectedRoute` - Route wrapper for authentication checks
- `AdminLayout` - Sidebar navigation + header for admin pages

### Development Workflow

1. **Write Test First** (Red): Create failing test
2. **Implement Minimum Code** (Green): Make test pass
3. **Refactor**: Clean up code while keeping tests green
4. **Get Review**: Let navigator review before proceeding
5. **Run Linting**: Ensure no linting errors or warnings
6. **Run All Tests**: Ensure no regressions (`npm test`)
7. **Verify Build**: Ensure production build succeeds (`npm run build`)
8. **Check Coverage**: Verify 80% coverage maintained

### Common Patterns

1. **Loading States**: Show loading text or spinner while `isLoading === true`
2. **Error Display**: Use `<Callout.Root color="red">` with `ExclamationTriangleIcon`
3. **Empty States**: Handle empty data arrays gracefully
4. **Optimistic Updates**: Update local state immediately, refresh on error
5. **Table Actions**: Use icon buttons (e.g., `TrashIcon`) for row-level actions
6. **Form Submission**: Disable button while `isLoading`, clear errors on input change
7. **Navigation**: Use React Router's `useNavigate()` hook for programmatic navigation
8. **Active State**: Check `location.pathname` with `useLocation()` for active nav items

### Accessibility

1. **Labels**: Use proper `<TextField.Root>` with labels from Radix UI
2. **Buttons**: Use descriptive text or aria-labels
3. **Roles**: Leverage semantic HTML and ARIA roles
4. **Focus**: Ensure keyboard navigation works
5. **Error Messages**: Associate errors with form fields

### Performance

1. **Lazy Loading**: Not currently implemented, but consider for large apps
2. **Memoization**: Use `useMemo` and `useCallback` sparingly (only when needed)
3. **Re-renders**: Minimize by proper state structure
4. **Bundle Size**: Keep dependencies minimal

### What NOT to Do

1. ❌ Don't use `any` type (use proper TypeScript types)
2. ❌ Don't skip `credentials: 'include'` in fetch calls (breaks authentication)
3. ❌ Don't forget to wrap tests in `MemoryRouter` and `AuthProvider`
4. ❌ Don't use `fireEvent` (use `userEvent` instead)
5. ❌ Don't skip error handling in async operations
6. ❌ Don't forget to set `isLoading` states
7. ❌ Don't ignore linting warnings (fix them all)
8. ❌ Don't write implementation before tests (follow TDD)
9. ❌ Don't proceed without navigator review after each TDD step
10. ❌ Don't hardcode API responses (mock `window.fetch` in tests)
11. ❌ Don't forget `await waitFor()` for async test assertions
12. ❌ Don't mix default and named exports inconsistently (pages: default, components: named)
13. ❌ Don't use inline styles when Radix UI props are available
14. ❌ Don't forget to clear errors when user starts typing

### ESLint Configuration

The project uses ESLint 9 flat config with:

- React hooks plugin
- React refresh plugin
- TypeScript ESLint
- Exception for Context files: `react-refresh/only-export-components` disabled where both hook and Provider are exported

### API Endpoint Reference

See `backend/API.md` for complete API documentation. Frontend currently uses:

**Authentication:**

- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

**Admin Users:**

- `GET /api/admin/users` - List users
- `PATCH /api/admin/users/:id` - Update admin status

**Admin Ingredients:**

- `GET /api/admin/ingredients` - List ingredients
- `POST /api/admin/ingredients` - Create ingredient
- `DELETE /api/admin/ingredients/:id` - Delete ingredient

**Admin Events (not yet implemented):**

- `GET /api/admin/events` - List events
- `POST /api/admin/events` - Create event
- `DELETE /api/admin/events/:id` - Delete event
- Event-Ingredients endpoints (see backend/API.md)

### Browser Compatibility

- Target: Modern browsers (ES2020+)
- Vite default browser targets apply
- No special polyfills required

### Environment Variables

Not currently used, but pattern for future:

```typescript
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
```
