import { Queue } from "bullmq";
import { redis } from "../utils/redis";

const submissionQueue = new Queue("grade_assignment", {
    connection: redis,
});

async function testQueue() {
    console.log("Adding test job to queue...");

    // Replace with your actual submission data
    const job = await submissionQueue.add("grade_assignment", {
        id: "test-submission-123",
        public_url:
            "https://pub-f102fc41ae574108acfc77e85199838e.r2.dev/2d84ec43-2f75-44ba-826f-5e5712e8b639/82df9200-3b8c-4382-9841-2ccc4d2b53b2",
        score: null,
        feedback: null,
        status: "PENDING",
        submittedAt: new Date().toISOString(),
        gradedAt: null,
        studentId: "82df9200-3b8c-4382-9841-2ccc4d2b53b2",
        assignmentId: "2d84ec43-2f75-44ba-826f-5e5712e8b639",
    });

    console.log("✅ Job added with ID:", job.id);

    // Subscribe to progress events
    const pubsub = redis.duplicate();
    await pubsub.connect();
    await pubsub.subscribe(`submission:test-submission-123`);

    console.log("\n📡 Listening for progress events...\n");

    pubsub.on("message", (channel, message) => {
        const event = JSON.parse(message);
        console.log(`[${event.step || "event"}] ${event.percent}%`, event);

        if (event.step === "grading_completed") {
            console.log("\n🎉 Grading completed!");
            console.log(`Final Score: ${event.score}/100`);
            pubsub.quit();
            redis.quit();
            process.exit(0);
        }
    });

    // Check queue stats
    const waiting = await submissionQueue.getWaitingCount();
    const active = await submissionQueue.getActiveCount();
    const completed = await submissionQueue.getCompletedCount();
    const failed = await submissionQueue.getFailedCount();

    console.log("\n📊 Queue Stats:");
    console.log(`  Waiting: ${waiting}`);
    console.log(`  Active: ${active}`);
    console.log(`  Completed: ${completed}`);
    console.log(`  Failed: ${failed}\n`);
}

testQueue().catch(console.error);
