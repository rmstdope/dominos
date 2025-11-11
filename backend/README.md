# Backend

Node.js/Express backend for Domino's Pizza Topping Selection application.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Build

```bash
npm run build
npm start
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## Endpoints

- `GET /` - API information
- `GET /health` - Health check
