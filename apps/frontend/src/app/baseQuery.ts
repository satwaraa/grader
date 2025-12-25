import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getApiUrl } from '../config';
import { logout, setCredentials } from '../features/auth/authSlice';
import type { RootState } from './store';

// Create a new mutex
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

const baseQuery = fetchBaseQuery({
    baseUrl: getApiUrl(),
    prepareHeaders: (headers, { getState }) => {
        const token = (getState() as RootState).auth.token || localStorage.getItem('accessToken');
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
        return headers;
    },
});

export const baseQueryWithReauth: BaseQueryFn<
    string | FetchArgs,
    unknown,
    FetchBaseQueryError
> = async (args, api, extraOptions) => {
    // wait until the mutex is available without locking it
    if (isRefreshing && refreshPromise) {
        await refreshPromise;
    }

    let result = await baseQuery(args, api, extraOptions);

    if (result.error && result.error.status === 401) {
        if (!isRefreshing) {
            isRefreshing = true;
            const refreshToken = localStorage.getItem('refreshToken');

            if (!refreshToken) {
                api.dispatch(logout());
                return result;
            }

            refreshPromise = (async () => {
                try {
                    const refreshResult = await baseQuery(
                        {
                            url: '/auth/refresh',
                            method: 'POST',
                            body: { refreshToken },
                        },
                        api,
                        extraOptions
                    );

                    if (refreshResult.data) {
                        const data = refreshResult.data as {
                            data?: { accessToken?: string; refreshToken?: string };
                        };
                        const { accessToken, refreshToken: newRefreshToken } = data.data || {};

                        if (accessToken) {
                            // Update stored tokens
                            const currentUser = (api.getState() as RootState).auth.user;
                            if (currentUser) {
                                api.dispatch(
                                    setCredentials({
                                        user: currentUser,
                                        accessToken,
                                        refreshToken: newRefreshToken || refreshToken,
                                    })
                                );
                                return true;
                            }
                        }

                        api.dispatch(logout());
                        return false;
                    } else {
                        api.dispatch(logout());
                        return false;
                    }
                } catch {
                    api.dispatch(logout());
                    return false;
                } finally {
                    isRefreshing = false;
                    refreshPromise = null;
                }
            })();

            const success = await refreshPromise;
            if (success) {
                // retry the initial query
                result = await baseQuery(args, api, extraOptions);
            }
        } else {
            // If we were waiting for a refresh, retry now
            if (refreshPromise) {
                await refreshPromise;
                result = await baseQuery(args, api, extraOptions);
            }
        }
    }
    return result;
};
