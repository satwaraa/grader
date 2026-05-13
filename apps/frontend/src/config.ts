// Vite bakes VITE_* env vars at build time.
// Set VITE_API_URL and VITE_WS_URL in .env (or pass as Docker build args)
// before building. Dev defaults to localhost so contributors don't need a .env.

const isDevelopment = import.meta.env.DEV;
const DEV_API_URL = 'http://localhost:8600/api';
const DEV_WS_URL = 'http://localhost:8600';

export function getApiUrl(): string {
    const fromEnv = import.meta.env.VITE_API_URL;
    if (fromEnv) return fromEnv;
    if (isDevelopment) return DEV_API_URL;
    throw new Error('VITE_API_URL is not set. Set it in .env before building.');
}

export function getWsUrl(): string {
    const fromEnv =
        import.meta.env.VITE_WS_URL ||
        import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '');
    if (fromEnv) return fromEnv;
    if (isDevelopment) return DEV_WS_URL;
    throw new Error('VITE_WS_URL (or VITE_API_URL) is not set. Set it in .env before building.');
}
