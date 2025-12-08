import { prisma } from "../../lib/prisma";

export class SubmissionManager {
    async createSubmission(data: {
        content: string;
        studentId: string;
        assignmentId: string;
    }) {
        return prisma.submission.create({
            data,
        });
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
}
