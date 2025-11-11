# Domino's Pizza Topping Selection

A full-stack TypeScript web application for managing pizza topping preferences at team pizza dinners.

## CI/CD Pipeline

### Continuous Integration

The project uses GitHub Actions for automated continuous integration. On every push to `main` and every pull request, the CI pipeline runs:

- **Backend Lint**: ESLint checks for code quality (< 5 min)
- **Backend Test**: Full test suite with coverage reporting (< 5 min)
- **Backend Build**: TypeScript compilation verification (< 5 min)

**Total CI time**: Under 10 minutes (typically 3-4 minutes)

The pipeline enforces a "stop the line" mentality - all jobs must pass for the build to succeed. Failed builds must be fixed immediately before new work proceeds.

#### Local Development

Run the same checks locally before pushing:

```bash
cd backend
npm run lint        # Run linting
npm test           # Run tests
npm run build      # Verify build
```
