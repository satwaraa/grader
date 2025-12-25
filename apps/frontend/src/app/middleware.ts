import { isRejectedWithValue, type Middleware } from '@reduxjs/toolkit';
import { logout } from '../features/auth/authSlice';

export const unauthenticatedMiddleware: Middleware =
    ({ dispatch }) =>
    (next) =>
    (action) => {
        if (isRejectedWithValue(action) && (action.payload as { status?: number })?.status === 401) {
            dispatch(logout());
            // Optional: Force redirect if not handled by React Router
            // window.location.href = "/login";
        }

        return next(action);
    };
