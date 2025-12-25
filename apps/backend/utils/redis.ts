// import { RedisClient } from "bun";

// const redisClient = new RedisClient(process.env.REDIS_URL);

// // await redisClient.connect();

// export default redisClient;

import IORedis from "ioredis";

// Access process.env through globalThis to prevent bundler constant folding
// This forces runtime evaluation instead of build-time optimization
const env = (globalThis as any).process?.env || {};
const nodeEnv = env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

// Only load dotenv in development (not in production/Kubernetes)
if (!isProduction) {
    try {
        const { config } = require("dotenv");
        const path = require("path");
        config({ path: path.join(__dirname, "../.env") });
    } catch {
        // Ignore if dotenv not available
    }
}

// Use REDIS_URL from environment in production, localhost in development
const localRedisUrl = "redis://localhost:6379";
const redisUrl = isProduction ? (env.REDIS_URL || localRedisUrl) : localRedisUrl;

console.log(`📡 Redis connecting to: ${redisUrl} (${isProduction ? "production" : "development"})`);

export const redis = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
});
