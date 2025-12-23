/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
}

export const successResponse = <T>(data: T, message?: string): ApiResponse<T> => ({
    success: true,
    message,
    data,
});

export const errorResponse = (message: string, error?: string): ApiResponse => ({
    success: false,
    message,
    error,
});
