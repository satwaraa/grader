import type { NextFunction, Request, Response } from "express";
import { authManager } from "../auth/auth.manager";
import type Role from "../types/roles";

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
        req.user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role as Role,
        };

        next();
    } catch {
        return res.status(401).json({
            success: false,
            message: "Authentication failed",
        });
    }
};

export const requireRole = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const userRole = req.user.role;

        if (!roles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: "Insufficient permissions",
            });
        }

        next();
    };
};
