import { Queue } from "bullmq";
import { redis } from "../utils/redis";

const queue = new Queue("grade_assignment", {
    connection: redis,
});

async function checkQueue() {
    console.log("📊 Checking queue status...\n");

    const waiting = await queue.getWaitingCount();
    const active = await queue.getActiveCount();
    const completed = await queue.getCompletedCount();
    const failed = await queue.getFailedCount();
    const delayed = await queue.getDelayedCount();

    console.log("Queue Stats:");
    console.log(`  ⏳ Waiting: ${waiting}`);
    console.log(`  🔄 Active: ${active}`);
    console.log(`  ✅ Completed: ${completed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  ⏰ Delayed: ${delayed}`);

    // Get waiting jobs
    if (waiting > 0) {
        console.log("\n📋 Waiting Jobs:");
        const waitingJobs = await queue.getWaiting(0, 10);
        waitingJobs.forEach((job) => {
            console.log(`  - Job ${job.id}:`, job.data);
        });
    }

    // Get failed jobs
    if (failed > 0) {
        console.log("\n❌ Failed Jobs:");
        const failedJobs = await queue.getFailed(0, 10);
        failedJobs.forEach((job) => {
            console.log(`  - Job ${job.id}:`, job.failedReason);
        });
    }

    await redis.quit();
    process.exit(0);
}

checkQueue().catch(console.error);
