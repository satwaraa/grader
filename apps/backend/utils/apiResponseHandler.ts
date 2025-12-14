import { type Response } from "express";

export class AppError extends Error {
    statusCode: number;
    // details: any;
    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        // this.details = details;
    }
}

export const handleError = (res: Response, err: unknown) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            message: err.message,
            code: err.statusCode,
            // details: err.details || null,
        });
    }

    if (err instanceof Error) {
        return res.status(500).json({
            message: err.message,
            code: 500,
            details: null,
        });
    }

    return res.status(500).json({
        message: "Unknown error",
        code: 500,
        details: err,
    });
};
