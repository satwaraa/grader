import { prisma } from "../../lib/prisma";

export class AssignmentManager {
    async createAssignment(data: {
        title: string;
        description?: string;
        maxScore?: number;
        dueDate?: Date;
        otp: string;
        teacherId: string;
        rubricId?: string;
    }) {
        return prisma.assignment.create({
            data,
        });
    }

    async getAssignmentsByTeacher(teacherId: string) {
        return prisma.assignment.findMany({
            where: { teacherId },
            include: {
                _count: {
                    select: { submissions: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }

    async getAssignmentById(id: string) {
        return prisma.assignment.findUnique({
            where: { id },
            include: {
                teacher: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                rubric: true,
            },
        });
    }

    async getAllAssignments() {
        // For students or general view if needed
        return prisma.assignment.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                rubric: true,
            },
        });
    }
}
