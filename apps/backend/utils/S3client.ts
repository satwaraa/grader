import { S3Client } from "bun";
const Client = new S3Client({
    accessKeyId: process.env.ACCESSKEYID,
    secretAccessKey: process.env.SECRETACCESSKEY,
    bucket: process.env.BUCKET_NAME,
    endpoint: process.env.R2_ENDPOINT,
});

export default Client;
