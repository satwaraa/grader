// lib/queue.ts
import { Queue } from "bullmq";
import { redis } from "./redis";

export const submissionQueue = new Queue("grade_assignment", {
    connection: redis,
});
