# LPU Project - Turborepo Monorepo

This is a monorepo managed with Turborepo containing:

- **apps/backend**: Express + Prisma backend API
- **apps/frontend**: React + Vite frontend application

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

Run both apps in development mode:

```bash
npm run dev
```

Or run individual apps:

```bash
# Backend only
cd apps/backend && bun run dev

# Frontend only
cd apps/frontend && npm run dev
```

### Build

Build all apps:

```bash
npm run build
```

### Lint

Lint all apps:

```bash
npm run lint
```

### Clean

Clean build artifacts:

```bash
npm run clean
```

## Docker Deployment

### Development Mode (with hot reload)

Start all services in development mode:

```bash
npm run docker:dev
```

Or rebuild and start:

```bash
npm run docker:dev:build
```

Stop development containers:

```bash
npm run docker:dev:down
```

**Services:**

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- MongoDB: localhost:27017

### Production Mode

Build and deploy in production mode:

```bash
npm run docker:prod:build
```

Start production containers:

```bash
npm run docker:prod
```

Stop all containers:

```bash
npm run docker:down
```

View logs:

```bash
npm run docker:logs
```

Clean up containers and volumes:

```bash
npm run docker:clean
```

**Services:**

- Frontend: http://localhost:80
- Backend API: http://localhost:3000
- MongoDB: localhost:27017

### Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Update the values in `.env` as needed.

## Project Structure

```
.
├── apps/
│   ├── backend/           # Express + Prisma API
│   │   ├── Dockerfile     # Production build
│   │   └── Dockerfile.dev # Development build
│   └── frontend/          # React + Vite app
│       ├── Dockerfile     # Production build
│       ├── Dockerfile.dev # Development build
│       └── nginx.conf     # Nginx configuration
├── docker-compose.yml     # Production compose
├── docker-compose.dev.yml # Development compose
├── package.json           # Root package.json with workspaces
├── turbo.json            # Turborepo configuration
└── README.md
```

## Learn More

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Turborepo Handbook](https://turbo.build/repo/docs/handbook)
- [Docker Documentation](https://docs.docker.com/)
