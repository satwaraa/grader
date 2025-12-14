import "express";
import type Role from "./roles";

declare module "express-serve-static-core" {
    interface Request {
        user: {
            id: string;
            role: Role;
        };
    }
}
