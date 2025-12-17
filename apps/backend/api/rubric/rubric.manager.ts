import { prisma } from "../../lib/prisma";

export class RubricManager {
    async createRubric(data: {
        name: string;
        criteria: any; // Json
        teacherId: string;
    }) {
        return prisma.rubric.create({
            data,
        });
    }

    async getRubricsByTeacher(teacherId: string) {
        return prisma.rubric.findMany({
            where: { teacherId },
            orderBy: { createdAt: "desc" },
        });
    }

    async getRubricById(id: string) {
        return prisma.rubric.findUnique({
            where: { id },
        });
    }

    async updateRubric(id: string, data: { name?: string; criteria?: any }) {
        return prisma.rubric.update({
            where: { id },
            data,
        });
    }

    async deleteRubric(id: string) {
        return prisma.rubric.delete({
            where: { id },
        });
    }
}
