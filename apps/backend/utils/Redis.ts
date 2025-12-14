import { RedisClient } from "bun";

const redisClient = new RedisClient(process.env.REDIS_URL);
// await redisClient.connect();

export default redisClient;
