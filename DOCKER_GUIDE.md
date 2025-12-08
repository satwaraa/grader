# Docker Deployment Guide

This guide will help you deploy the LPU Project using Docker.

## Prerequisites

- Docker and Docker Compose installed
- MongoDB Atlas account (or any cloud MongoDB service)
- Git (optional, for version control)

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit the `.env` file and add your MongoDB connection string:

```env
# Your MongoDB Atlas connection string
DATABASE_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority

# Backend configuration
NODE_ENV=production
PORT=3000

# Frontend configuration
VITE_API_URL=http://localhost:3000
```

**Getting your MongoDB Atlas connection string:**

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Navigate to your cluster
3. Click "Connect" → "Connect your application"
4. Copy the connection string
5. Replace `<username>`, `<password>`, and `<database>` with your actual credentials

### 2. Development Mode

Start the development environment with hot reload:

```bash
npm run docker:dev:build
```

This will:

- Build the Docker images
- Start the backend on http://localhost:3000
- Start the frontend on http://localhost:5173
- Enable hot reload for both apps

**View logs:**

```bash
docker-compose -f docker-compose.dev.yml logs -f
```

**Stop development containers:**

```bash
npm run docker:dev:down
```

### 3. Production Mode

Build and deploy for production:

```bash
npm run docker:prod:build
```

This will:

- Build optimized production images
- Start the backend on http://localhost:3000
- Start the frontend on http://localhost:80 (nginx)
- Run with production optimizations

**View logs:**

```bash
npm run docker:logs
```

**Stop production containers:**

```bash
npm run docker:down
```

## Available Commands

### Development

- `npm run docker:dev` - Start dev containers (use existing images)
- `npm run docker:dev:build` - Rebuild and start dev containers
- `npm run docker:dev:down` - Stop dev containers

### Production

- `npm run docker:prod` - Start prod containers (use existing images)
- `npm run docker:prod:build` - Rebuild and start prod containers
- `npm run docker:down` - Stop prod containers

### Utilities

- `npm run docker:logs` - View logs from all containers
- `npm run docker:clean` - Stop containers and remove volumes

## Testing the Deployment

### Backend Health Check

```bash
curl http://localhost:3000/health
```

Or visit http://localhost:3000/health in your browser.

### Frontend

- **Development:** http://localhost:5173
- **Production:** http://localhost:80

## Common Issues and Solutions

### Issue: Container fails to start

**Solution:** Check the logs:

```bash
docker-compose logs backend
docker-compose logs frontend
```

### Issue: Database connection error

**Solution:** Verify your `.env` file has the correct `DATABASE_URL`:

- Ensure username, password, and database name are correct
- Check if your IP is whitelisted in MongoDB Atlas (Network Access)
- Test the connection string manually

### Issue: Port already in use

**Solution:** Either:

1. Stop the service using that port
2. Or modify the port mapping in `docker-compose.yml`:
   ```yaml
   ports:
     - "3001:3000" # Use 3001 instead of 3000
   ```

### Issue: Changes not reflected

**Development:**

- Hot reload should work automatically
- If not, restart: `npm run docker:dev:down && npm run docker:dev:build`

**Production:**

- Rebuild images: `npm run docker:prod:build`

## Rebuilding After Code Changes

### Development Mode

Code changes are automatically reflected (hot reload enabled).

### Production Mode

After making changes, rebuild the images:

```bash
npm run docker:down
npm run docker:prod:build
```

## Database Migrations

If you make changes to the Prisma schema:

```bash
# Enter the backend container
docker exec -it lpu-backend sh

# Run Prisma migrations
bunx prisma generate
bunx prisma db push
```

Or run from host (if Bun is installed):

```bash
cd apps/backend
bunx prisma generate
bunx prisma db push
```

## Cleaning Up

Remove all containers and volumes:

```bash
npm run docker:clean
```

Remove unused Docker images:

```bash
docker system prune -a
```

## Environment Variables Reference

| Variable       | Description               | Example                                          |
| -------------- | ------------------------- | ------------------------------------------------ |
| `DATABASE_URL` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `NODE_ENV`     | Environment mode          | `development` or `production`                    |
| `PORT`         | Backend server port       | `3000`                                           |
| `VITE_API_URL` | Frontend API endpoint     | `http://localhost:3000`                          |

## Architecture Overview

```
┌─────────────────────────────────────────┐
│           Docker Compose                │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐    ┌──────────────┐  │
│  │   Frontend   │    │   Backend    │  │
│  │              │    │              │  │
│  │  React+Vite  │───▶│ Express+Bun  │  │
│  │    (Nginx)   │    │   +Prisma    │  │
│  │              │    │              │  │
│  │  Port: 80    │    │  Port: 3000  │  │
│  └──────────────┘    └──────┬───────┘  │
│                             │          │
└─────────────────────────────┼──────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  MongoDB Atlas   │
                    │   (Cloud)        │
                    └──────────────────┘
```

## Production Deployment (Cloud)

For deploying to cloud platforms like AWS, GCP, or Azure:

1. **Push images to a container registry:**

   ```bash
   docker tag lpu-backend:latest <registry>/lpu-backend:latest
   docker tag lpu-frontend:latest <registry>/lpu-frontend:latest
   docker push <registry>/lpu-backend:latest
   docker push <registry>/lpu-frontend:latest
   ```

2. **Update environment variables** in your cloud platform

3. **Use orchestration tools** like Kubernetes, ECS, or Cloud Run

## Support

For issues or questions:

- Check the logs: `npm run docker:logs`
- Review the [Docker documentation](https://docs.docker.com/)
- Review the [Turborepo documentation](https://turbo.build/repo/docs)
