import cors from "cors";
import express from "express";

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const corsOption = {
    origin: true,
    credentials: true,
    accessControlAllowOrigin: true,
};

app.use(cors(corsOption));

export default app;
