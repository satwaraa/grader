# Authentication API Documentation

## Setup

1. Install dependencies:

```bash
bun install
```

2. Set up your `.env` file:

```env
DATABASE_URL="your-mongodb-connection-string"
HTTP_PORT=8600
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
```

3. Generate Prisma Client:

```bash
bunx prisma generate
```

4. Start the server:

```bash
bun run dev
```

## API Endpoints

Base URL: `http://localhost:8600/api`

### Authentication Endpoints

#### 1. Register a new user

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "teacher@example.com",
  "password": "securepassword123",
  "name": "John Doe",
  "role": "TEACHER" // Optional: STUDENT, TEACHER, ADMIN (default: TEACHER)
}
```

**Response:**

```json
{
    "success": true,
    "message": "User registered successfully",
    "data": {
        "user": {
            "id": "507f1f77bcf86cd799439011",
            "email": "teacher@example.com",
            "name": "John Doe",
            "role": "TEACHER",
            "createdAt": "2025-12-09T10:00:00.000Z"
        },
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
}
```

#### 2. Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "teacher@example.com",
  "password": "securepassword123"
}
```

**Response:**

```json
{
    "success": true,
    "message": "Login successful",
    "data": {
        "user": {
            "id": "507f1f77bcf86cd799439011",
            "email": "teacher@example.com",
            "name": "John Doe",
            "role": "TEACHER",
            "createdAt": "2025-12-09T10:00:00.000Z",
            "updatedAt": "2025-12-09T10:00:00.000Z"
        },
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
}
```

#### 3. Get Current User (Protected)

```http
GET /api/auth/me
Authorization: Bearer <accessToken>
```

**Response:**

```json
{
    "success": true,
    "data": {
        "user": {
            "id": "507f1f77bcf86cd799439011",
            "email": "teacher@example.com",
            "name": "John Doe",
            "role": "TEACHER",
            "createdAt": "2025-12-09T10:00:00.000Z",
            "updatedAt": "2025-12-09T10:00:00.000Z"
        }
    }
}
```

#### 4. Refresh Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**

```json
{
    "success": true,
    "message": "Token refreshed successfully",
    "data": {
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
}
```

### Error Responses

All error responses follow this format:

```json
{
    "success": false,
    "message": "Error description"
}
```

Common HTTP status codes:

-   `200` - Success
-   `201` - Created
-   `400` - Bad Request (validation error)
-   `401` - Unauthorized (invalid credentials or token)
-   `403` - Forbidden (insufficient permissions)
-   `404` - Not Found
-   `500` - Internal Server Error

## Prisma Schema

The application uses MongoDB with the following models:

### User

-   `id`: String (ObjectId)
-   `email`: String (unique)
-   `password`: String (hashed)
-   `name`: String
-   `role`: UserRole (STUDENT, TEACHER, ADMIN)
-   `createdAt`: DateTime
-   `updatedAt`: DateTime

### Assignment

-   `id`: String (ObjectId)
-   `title`: String
-   `description`: String (optional)
-   `maxScore`: Int (default: 100)
-   `dueDate`: DateTime (optional)
-   `teacherId`: String (ObjectId)
-   `createdAt`: DateTime
-   `updatedAt`: DateTime

### Submission

-   `id`: String (ObjectId)
-   `content`: String
-   `score`: Int (optional)
-   `feedback`: String (optional)
-   `status`: SubmissionStatus (PENDING, GRADED, REVIEWING)
-   `submittedAt`: DateTime
-   `gradedAt`: DateTime (optional)
-   `studentId`: String (ObjectId)
-   `assignmentId`: String (ObjectId)

## Authentication Middleware

To protect routes, use the `authMiddleware`:

```typescript
import { authMiddleware, requireRole } from "../middleware/auth.middleware";

// Protect a route
router.get("/protected", authMiddleware, async (req, res) => {
    const userId = (req as any).userId;
    const userEmail = (req as any).userEmail;
    const userRole = (req as any).userRole;
    // Your code here
});

// Require specific role
router.post("/admin-only", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    // Only admins can access this
});

// Multiple roles
router.post(
    "/teacher-or-admin",
    authMiddleware,
    requireRole("TEACHER", "ADMIN"),
    async (req, res) => {
        // Teachers and Admins can access this
    },
);
```

## JWT Token Structure

Access tokens contain:

```json
{
    "userId": "507f1f77bcf86cd799439011",
    "email": "teacher@example.com",
    "role": "TEACHER",
    "iat": 1702123456,
    "exp": 1702124356
}
```

## Security Best Practices

1. **Never commit `.env` file** - Add it to `.gitignore`
2. **Change JWT secrets in production** - Use strong, random strings
3. **Use HTTPS in production** - Never send tokens over HTTP
4. **Store tokens securely** - Use httpOnly cookies or secure storage
5. **Implement rate limiting** - Prevent brute force attacks
6. **Validate all inputs** - Add proper validation middleware
7. **Use short-lived access tokens** - Default is 15 minutes
8. **Rotate refresh tokens** - Implement token rotation for better security

## Testing with cURL

### Register:

```bash
curl -X POST http://localhost:8600/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "password123",
    "name": "John Doe"
  }'
```

### Login:

```bash
curl -X POST http://localhost:8600/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "password123"
  }'
```

### Get Current User:

```bash
curl -X GET http://localhost:8600/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Development

Run in development mode with auto-reload:

```bash
bun run dev
```

Build for production:

```bash
bun run build
```
