// import { RedisClient } from "bun";

// const redisClient = new RedisClient(process.env.REDIS_URL);

// // await redisClient.connect();

// export default redisClient;

import { config } from "dotenv";
import IORedis from "ioredis";
import path from "path";

config({ path: path.join(__dirname, "../.env") });

console.log(process.env.REDIS_URL);

export const redis = new IORedis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
});
