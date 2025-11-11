# Domino's Pizza Topping Selection

A full-stack TypeScript web application for managing pizza topping preferences at team pizza dinners.

## CI/CD Pipeline

### Continuous Integration

The project uses GitHub Actions for automated continuous integration. On every push to `main` and every pull request, the CI pipeline runs:

- **Backend Lint**: ESLint checks for code quality (< 5 min)
- **Backend Test**: Full test suite with coverage reporting (< 5 min)
- **Backend Build**: TypeScript compilation verification (< 5 min)
- **Backend Docker**: Docker image build and health check (< 5 min)

**Total CI time**: Under 10 minutes (typically 3-5 minutes)

The pipeline enforces a "stop the line" mentality - all jobs must pass for the build to succeed. Failed builds must be fixed immediately before new work proceeds.

### Continuous Deployment

When CI passes on the `main` branch, the CD pipeline automatically:

1. **Builds multi-platform Docker images** (amd64, arm64)
2. **Tags images** with multiple strategies:
   - `latest` - Most recent main build
   - `main-<sha>` - Specific commit SHA
   - `v1.2.3` - Semantic version (when tagged)
3. **Publishes to GitHub Container Registry** (ghcr.io)
4. **Creates deployment summary** with pull commands

**Published Images:**
- `ghcr.io/rmstdope/dominos/backend:latest`
- `ghcr.io/rmstdope/dominos/backend:main-<sha>`

Pull and run the latest production image:

```bash
docker pull ghcr.io/rmstdope/dominos/backend:latest
docker run -p 3000:3000 -e JWT_SECRET=your-secret ghcr.io/rmstdope/dominos/backend:latest
```

#### Local Development

Run the same checks locally before pushing:

```bash
cd backend
npm run lint        # Run linting
npm test           # Run tests
npm run build      # Verify build
```

## Docker Deployment

The application is fully containerized for consistent deployment across environments.

### Production Deployment

Build and run the application with Docker Compose:

```bash
# Build and start the backend
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop the application
docker-compose down
```

The backend will be available at `http://localhost:3000`.

### Environment Variables

Configure the application using environment variables:

- `JWT_SECRET`: Secret key for JWT token signing (required in production)
- `PORT`: Port number (default: 3000)
- `NODE_ENV`: Environment mode (development/production)
- `DATABASE_PATH`: SQLite database file path

Create a `.env` file in the project root:

```env
JWT_SECRET=your-secure-secret-key
PORT=3000
NODE_ENV=production
```

### Development with Docker

For development with hot reload:

```bash
# Start development container
docker-compose --profile dev up backend-dev

# Run tests in container
docker-compose exec backend npm test
```

### Manual Docker Build

Build the backend image directly:

```bash
cd backend
docker build -t dominos-backend .
docker run -p 3000:3000 -e JWT_SECRET=secret dominos-backend
```
