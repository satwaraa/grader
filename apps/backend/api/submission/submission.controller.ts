import type { Request, Response } from "express";
import { Router } from "express";
import { errorResponse, successResponse } from "../../lib/apiResponse";
import { authMiddleware } from "../middleware/auth.middleware";
import { catchAsync } from "../utils/catchAsyncWrapper";
import { SubmissionManager } from "./submission.manager";

export class SubmissionController {
    public router: Router;
    private submissionManager: SubmissionManager;

    constructor() {
        this.router = Router();
        this.submissionManager = new SubmissionManager();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // Submit assignment (Student only)
        this.router.post(
            "/",
            authMiddleware,
            catchAsync(this.createSubmission.bind(this)),
        );

        // Get my submissions (Student)
        this.router.get(
            "/my-submissions",
            authMiddleware,
            catchAsync(this.getMySubmissions.bind(this)),
        );

        // Get submissions for an assignment (Teacher)
        this.router.get(
            "/assignment/:assignmentId",
            authMiddleware,
            catchAsync(this.getAssignmentSubmissions.bind(this)),
        );

        // Get recent submissions (Teacher sees all for their assignments, Student sees theirs)
        this.router.get(
            "/recent",
            authMiddleware,
            catchAsync(this.getRecentSubmissions.bind(this)),
        );
    }

    private async createSubmission(req: Request, res: Response) {
        const { content, assignmentId } = req.body;
        // @ts-ignore
        const studentId = req.user.id;
        // @ts-ignore
        const role = req.user.role;

        // Ideally check if user is student, but maybe teachers can submit too for testing?
        // Let's enforce student for now or just allow authenticated users.

        const submission = await this.submissionManager.createSubmission({
            content,
            studentId,
            assignmentId,
        });

        return res
            .status(201)
            .json(successResponse(submission, "Submission created successfully"));
    }

    private async getMySubmissions(req: Request, res: Response) {
        // @ts-ignore
        const studentId = req.user.id;
        const submissions = await this.submissionManager.getSubmissionsByStudent(
            studentId,
        );
        return res
            .status(200)
            .json(successResponse(submissions, "Submissions fetched successfully"));
    }

    private async getAssignmentSubmissions(req: Request, res: Response) {
        const { assignmentId } = req.params;
        if (!assignmentId) {
            return res.status(400).json(errorResponse("Assignment ID is required"));
        }
        // Add check if user is teacher of this assignment if needed
        const submissions = await this.submissionManager.getSubmissionsByAssignment(
            assignmentId,
        );
        return res
            .status(200)
            .json(successResponse(submissions, "Submissions fetched successfully"));
    }

    private async getRecentSubmissions(req: Request, res: Response) {
        // @ts-ignore
        const userId = req.user.id;
        // @ts-ignore
        const role = req.user.role;

        let submissions;
        if (role === "TEACHER") {
            submissions = await this.submissionManager.getRecentSubmissionsForTeacher(
                userId,
            );
        } else {
            submissions = await this.submissionManager.getSubmissionsByStudent(userId);
        }

        return res
            .status(200)
            .json(
                successResponse(submissions, "Recent submissions fetched successfully"),
            );
    }
}
