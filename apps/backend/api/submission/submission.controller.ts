import type { Request, Response } from "express";
import { Router } from "express";
import { errorResponse, successResponse } from "../../lib/apiResponse";
import { AppError, handleError } from "../../utils/apiResponseHandler";

import { submissionQueue } from "../../utils/queue";
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
        this.router.post(
            "/verifyAssignmentOtp",
            authMiddleware,
            catchAsync(this.verifyAssignmentOtp.bind(this)),
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
        this.router.get(
            "/recent",
            authMiddleware,
            catchAsync(this.getRecentSubmissions.bind(this)),
        );
        this.router.post("/reEvaluate", catchAsync(this.allowRevaluate.bind(this)));
    }

    private async createSubmission(req: Request, res: Response) {
        try {
            const { assignmentId } = req.body;
            const studentId = req.user.id;
            const role: Role = req.user.role;

            if (role === Role.STUDENT) {
                const submission = await this.submissionManager.createSubmission({
                    studentId,
                    assignmentId,
                });

                await submissionQueue.add("grade_assignment", submission, {
                    attempts: 3,
                    backoff: { type: "exponential", delay: 5000 },
                    removeOnComplete: true,
                    removeOnFail: false,
                });

                return res
                    .status(201)
                    .json(successResponse(submission, "Submission created successfully"));
            }
            return res.status(404).json({ message: "cant find assignmentId or otp" });
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
                return res.status(200).json({ url, key });
            }
            return res.status(400).json(errorResponse("Missing file details for upload"));
        } catch (error) {
            return handleError(res, error);
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
    public async verifyAssignmentOtp(req: Request, res: Response) {
        try {
            const { otp, assignmentId } = req.body as unknown as {
                otp: string;
                assignmentId: string;
            };
            if (!otp || !assignmentId) {
                throw new AppError("Otp or assignment id not found", 404);
            }
            const Verified = await this.submissionManager.verifyAssignmentOtp(
                assignmentId,
                otp,
            );

            if (Verified) {
                return res.status(200).json({ message: "verified" });
            }
            return res.status(403).json({ message: "invalid otp" });
        } catch (error) {
            return handleError(res, error);
        }
    }
    public async allowResbumission(req: Request, res: Response) {}
    public async allowRevaluate(req: Request, res: Response) {
        try {
            const { assignmentId, studentId } = req.body();
        } catch (error) {}
    }
}
