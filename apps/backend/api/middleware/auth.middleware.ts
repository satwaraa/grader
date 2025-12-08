import type { NextFunction, Request, Response } from "express";
import { authManager } from "../auth/auth.manager";

const authManagerInstance = new authManager();

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "No token provided",
            });
        }

        const token = authHeader.substring(7);
        const decoded = authManagerInstance.verifyAccessToken(token);

        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token",
            });
        }

        // Attach user info to request
        (req as any).userId = decoded.userId;
        (req as any).userEmail = decoded.email;
        (req as any).userRole = decoded.role;

        (req as any).user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
        };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Authentication failed",
        });
    }
};

export const requireRole = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const userRole = (req as any).userRole;

        if (!roles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: "Insufficient permissions",
            });
        }

        next();
    };
};
