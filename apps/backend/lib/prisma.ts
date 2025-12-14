import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import path from "path";
import { PrismaClient } from "../generated/prisma";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

config({ path: path.join(__dirname, "../.env") });
const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter,
        log:
            process.env.NODE_ENV === "development"
                ? ["query", "error", "warn"]
                : ["error"],
    });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
