// import { RedisClient } from "bun";

// const redisClient = new RedisClient(process.env.REDIS_URL);

// // await redisClient.connect();

// export default redisClient;

import { config } from "dotenv";
import IORedis from "ioredis";
import path from "path";

config({ path: path.join(__dirname, "../.env") });

// Use localhost in development, server URL in production
const isProduction = process.env.NODE_ENV === "production";
const localRedisUrl = "redis://localhost:6379";

// In development: ALWAYS use localhost (ignore .env REDIS_URL)
// In production: use REDIS_URL from environment
const redisUrl = isProduction ? process.env.REDIS_URL! : localRedisUrl;

console.log(`📡 Redis connecting to: ${redisUrl} (${isProduction ? "production" : "development"})`);

export const redis = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
});
