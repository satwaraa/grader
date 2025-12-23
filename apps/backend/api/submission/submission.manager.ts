import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/apiResponseHandler";
import Client from "../../utils/S3client";

export class SubmissionManager {
    async createSubmission(data: { studentId: string; assignmentId: string }) {
        try {
            const previousSubmission = await prisma.submission.findFirst({
                where: {
                    assignmentId: data.assignmentId,
                    studentId: data.studentId,
                },
            });
            if (previousSubmission)
                throw new AppError("You can only make One Submission", 403);
            if (process.env.PUBLIC_ENDPOINT) {
                const assignmentPublicUrl = `${process.env.PUBLIC_ENDPOINT}/${data.assignmentId}/${data.studentId}`;
                return prisma.submission.create({
                    data: {
                        assignmentId: data.assignmentId,
                        studentId: data.studentId,
                        public_url: assignmentPublicUrl,
                    },
                });
                // return prisma.submission.create({
                //     data: { ...data, public_url: assignmentPublicUrl },
                // });
            }
            throw new AppError("cant generate public url", 500);
        } catch (error) {
            if (error instanceof AppError) {
                throw new AppError(error.message, error.statusCode);
            }
            if (error instanceof Error) {
                throw new AppError(error.message, 500);
            }

            throw new AppError("something went wrong", 500);
        }
    }

    async getSubmissionsByStudent(studentId: string) {
        return prisma.submission.findMany({
            where: { studentId },
            include: {
                assignment: {
                    select: {
                        title: true,
                        dueDate: true,
                    },
                },
            },
            orderBy: { submittedAt: "desc" },
        });
    }

    async getSubmissionsByAssignment(assignmentId: string) {
        return prisma.submission.findMany({
            where: { assignmentId },
            include: {
                student: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { submittedAt: "desc" },
        });
    }

    async getRecentSubmissionsForTeacher(teacherId: string) {
        return prisma.submission.findMany({
            where: {
                assignment: {
                    teacherId: teacherId,
                },
            },
            include: {
                student: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                assignment: {
                    select: {
                        title: true,
                    },
                },
            },
            orderBy: { submittedAt: "desc" },
            take: 10,
        });
    }
    async presignedUrl(fileName: string, type: string, assignmentId: string, id: string) {
        try {
            const existingSubmission = await prisma.submission.findFirst({
                where: {
                    assignmentId,
                    studentId: id,
                },
            });

            if (existingSubmission) {
                throw new AppError("You can only make One Submission", 403);
            }

            const key = `/${assignmentId}/${id}`;
            const fileRef = Client.file(key);

            const url = fileRef.presign({
                method: "PUT",
                // contentType: type,
                expiresIn: 60,
            });

            return { url, key };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            if (error instanceof Error) {
                throw new AppError(error.message, 500);
            }
            throw new AppError("Can't create presignedUrl", 500);
        }
    }

    async updateSubmissionGrade(
        submissionId: string,
        data: {
            score: number;
            feedback: string;
            status: "GRADED" | "REVIEWING";
        },
    ) {
        try {
            return await prisma.submission.update({
                where: { id: submissionId },
                data: {
                    score: data.score,
                    feedback: data.feedback,
                    status: data.status,
                    gradedAt: new Date(),
                },
            });
        } catch (error) {
            if (error instanceof Error) {
                throw new AppError(error.message, 500);
            }
            throw new AppError("Failed to update submission grade", 500);
        }
    }
    async verifyAssignmentOtp(assignmentId: string, otp: string) {
        try {
            const verified = await prisma.assignment.findFirst({
                where: {
                    id: assignmentId,
                    otp: otp,
                },
            });
            return verified;
        } catch (error) {
            if (error instanceof Error) {
                throw new AppError(error.message, 500);
            }
        }
    }

    async deleteSubmission(submissionId: string) {
        try {
            await prisma.submission.delete({
                where: { id: submissionId },
            });
        } catch (error) {
            if (error instanceof Error) {
                throw new AppError(error.message, 500);
            }
            throw new AppError("Failed to delete submission", 500);
        }
    }
}
