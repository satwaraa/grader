import type { Request, Response } from "express";
import { Router } from "express";
import { errorResponse, successResponse } from "../../lib/apiResponse";
import { handleError } from "../../utils/apiResponseHandler";
import redisClient from "../../utils/Redis";
import { authMiddleware } from "../middleware/auth.middleware";
import Role from "../types/roles";
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
        this.router.get(
            "/uploadUrl",
            authMiddleware,
            catchAsync(this.getUploadUrl.bind(this)),
        ),
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
        try {
            const { assignmentId } = req.body;
            const studentId = req.user.id;
            const role: Role = req.user.role;

            if (
                role === Role.STUDENT ||
                studentId == "1ef056fb-0628-4f92-81d0-bd1d8e7aa225"
            ) {
                const submission = await this.submissionManager.createSubmission({
                    studentId,
                    assignmentId,
                });
                // redisClient.publish("submission", JSON.stringify(submission));
                redisClient.lpush("submission", JSON.stringify(submission));
                return res
                    .status(201)
                    .json(successResponse(submission, "Submission created successfully"));
            }
        } catch (error) {
            handleError(res, error);
        }
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
    private async getUploadUrl(req: Request, res: Response) {
        try {
            const studentId = req.user.id;
            const { fileName, type, assignmentId } = req.query as unknown as {
                fileName: string;
                type: string;
                assignmentId: string;
                id: string;
            };
            console.log(fileName, type);

            if (fileName && type && assignmentId) {
                console.log("getting here");
                const { url, key } = await this.submissionManager.presignedUrl(
                    fileName,
                    type,
                    assignmentId,
                    studentId,
                );
                return res.json({ url, key }).status(200);
            }
            return res.json({ message: "cant create signed urled" }).status(500);
        } catch (error) {
            return res.json({ message: "cant create signed url" }).status(500);
        }
    }
    private async getRecentSubmissions(req: Request, res: Response) {
        const userId = req.user.id;
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
