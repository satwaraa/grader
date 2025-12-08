import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";

interface RegisterInput {
    email: string;
    password: string;
    name: string;
    role?: "STUDENT" | "TEACHER" | "ADMIN";
}

interface TokenPayload {
    userId: string;
    email: string;
    role: string;
}

export class authManager {
    private JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
    private JWT_REFRESH_SECRET =
        process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key-change-this";
    private JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
    private JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

    async register(input: RegisterInput) {
        try {
            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
                where: { email: input.email },
            });

            if (existingUser) {
                return {
                    success: false,
                    message: "User with this email already exists",
                };
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(input.password, 10);

            // Create user
            const user = await prisma.user.create({
                data: {
                    email: input.email,
                    password: hashedPassword,
                    name: input.name,
                    role: input.role || "TEACHER",
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    createdAt: true,
                },
            });

            // Generate tokens
            const { accessToken, refreshToken } = this.generateTokens({
                userId: user.id,
                email: user.email,
                role: user.role,
            });

            return {
                success: true,
                message: "User registered successfully",
                data: {
                    user,
                    accessToken,
                    refreshToken,
                },
            };
        } catch (error) {
            console.error("Registration error:", error);
            return {
                success: false,
                message: "Failed to register user",
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async login(email: string, password: string) {
        try {
            // Find user
            const user = await prisma.user.findUnique({
                where: { email },
            });

            if (!user) {
                return {
                    success: false,
                    message: "Invalid email or password",
                };
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                return {
                    success: false,
                    message: "Invalid email or password",
                };
            }

            // Generate tokens
            const { accessToken, refreshToken } = this.generateTokens({
                userId: user.id,
                email: user.email,
                role: user.role,
            });

            // Return user without password
            const { password: _, ...userWithoutPassword } = user;

            return {
                success: true,
                message: "Login successful",
                data: {
                    user: userWithoutPassword,
                    accessToken,
                    refreshToken,
                },
            };
        } catch (error) {
            console.error("Login error:", error);
            return {
                success: false,
                message: "Failed to login",
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async getCurrentUser(userId: string) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });

            if (!user) {
                return {
                    success: false,
                    message: "User not found",
                };
            }

            return {
                success: true,
                data: { user },
            };
        } catch (error) {
            console.error("Get current user error:", error);
            return {
                success: false,
                message: "Failed to get user",
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async refreshToken(refreshToken: string) {
        try {
            // Verify refresh token
            const decoded = jwt.verify(
                refreshToken,
                this.JWT_REFRESH_SECRET,
            ) as TokenPayload;

            // Generate new tokens
            const tokens = this.generateTokens({
                userId: decoded.userId,
                email: decoded.email,
                role: decoded.role,
            });

            return {
                success: true,
                message: "Token refreshed successfully",
                data: tokens,
            };
        } catch (error) {
            console.error("Refresh token error:", error);
            return {
                success: false,
                message: "Invalid or expired refresh token",
            };
        }
    }

    private generateTokens(payload: TokenPayload) {
        const accessToken = jwt.sign(payload, this.JWT_SECRET, {
            expiresIn: this.JWT_EXPIRES_IN,
        } as jwt.SignOptions);

        const refreshToken = jwt.sign(payload, this.JWT_REFRESH_SECRET, {
            expiresIn: this.JWT_REFRESH_EXPIRES_IN,
        } as jwt.SignOptions);

        return { accessToken, refreshToken };
    }

    verifyAccessToken(token: string): TokenPayload | null {
        try {
            return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
        } catch (error) {
            return null;
        }
    }
}
