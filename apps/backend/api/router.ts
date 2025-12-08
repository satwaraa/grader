import { Router } from "express";
import { AssignmentController } from "./assignment/assignment.controller";
import { AuthController } from "./auth/auth.controller";
import { SubmissionController } from "./submission/submission.controller";
import { userController } from "./user/user.controller";

const router = Router();

// Initialize controllers
const authController = new AuthController();
const userCtrl = new userController();
const assignmentCtrl = new AssignmentController();
const submissionCtrl = new SubmissionController();

// Mount routes
router.use("/auth", authController.router);
router.use("/users", userCtrl.router);
router.use("/assignments", assignmentCtrl.router);
router.use("/submissions", submissionCtrl.router);

// Health check
router.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
