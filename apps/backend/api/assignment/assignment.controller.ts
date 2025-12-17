import type { Request, Response } from "express";
import { Router } from "express";
import { errorResponse, successResponse } from "../../lib/apiResponse";
import { authMiddleware } from "../middleware/auth.middleware";
import { catchAsync } from "../utils/catchAsyncWrapper";
import generateNumericOTP from "../utils/generateOTP";
import { AssignmentManager } from "./assignment.manager";

export class AssignmentController {
    public router: Router;
    private assignmentManager: AssignmentManager;

    constructor() {
        this.router = Router();
        this.assignmentManager = new AssignmentManager();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // Create assignment (Teacher only)
        this.router.post(
            "/",
            authMiddleware,
            // Add role check middleware here if needed, for now assuming auth is enough or check in handler
            catchAsync(this.createAssignment.bind(this)),
        );

        // Get all assignments (Teacher sees theirs, Student sees all? Or logic specific)
        // For dashboard, we probably want "my assignments" for teacher
        this.router.get(
            "/teacher/my-assignments",
            authMiddleware,
            catchAsync(this.getTeacherAssignments.bind(this)),
        );

        // Get all assignments (Student)
        this.router.get(
            "/student/all",
            authMiddleware,
            catchAsync(this.getStudentAssignments.bind(this)),
        );

        // Get single assignment (Public or Protected? "shareable link" implies maybe public or just student accessible)
        this.router.get("/:id", catchAsync(this.getAssignment.bind(this)));
    }

    private async createAssignment(req: Request, res: Response) {
        const { title, description, maxScore, dueDate, rubricId } = req.body;
        const teacherId = req.user.id;
        const role = req.user.role;

        if (role !== "TEACHER") {
            return res
                .status(403)
                .json(errorResponse("Only teachers can create assignments"));
        }

        const otp = generateNumericOTP(6);

        const assignment = await this.assignmentManager.createAssignment({
            title,
            description,
            maxScore: maxScore ? parseInt(maxScore) : 100,
            dueDate: dueDate ? new Date(dueDate) : undefined,
            otp,
            teacherId,
            rubricId,
        });

        return res
            .status(201)
            .json(successResponse(assignment, "Assignment created successfully"));
    }

    private async getTeacherAssignments(req: Request, res: Response) {
        const teacherId = req.user.id;

        const assignments = await this.assignmentManager.getAssignmentsByTeacher(
            teacherId,
        );
        return res
            .status(200)
            .json(successResponse(assignments, "Assignments fetched successfully"));
    }

    private async getStudentAssignments(req: Request, res: Response) {
        const assignments = await this.assignmentManager.getAllAssignments();
        return res
            .status(200)
            .json(successResponse(assignments, "Assignments fetched successfully"));
    }

    private async getAssignment(req: Request, res: Response) {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json(errorResponse("Assignment ID is required"));
        }
        const assignment = await this.assignmentManager.getAssignmentById(id);

        if (!assignment) {
            return res.status(404).json(errorResponse("Assignment not found"));
        }

        return res
            .status(200)
            .json(successResponse(assignment, "Assignment fetched successfully"));
    }
}
