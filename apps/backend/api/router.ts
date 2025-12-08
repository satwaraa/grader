import { Router } from "express";
import { AuthController } from "./auth/auth.controller";
import { userController } from "./user/user.controller";

const router = Router();

// Initialize controllers
const authController = new AuthController();
const userCtrl = new userController();

// Mount routes
router.use("/auth", authController.router);
router.use("/users", userCtrl.router);

// Health check
router.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
