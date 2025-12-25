// Runtime configuration for API and WebSocket URLs
// Vite environment variables are baked in at build time, so we need a runtime solution

const isDevelopment = import.meta.env.DEV;

/**
 * Get the API base URL
 * In development: uses VITE_API_URL or falls back to localhost
 * In production: uses the production API domain
 */
export function getApiUrl(): string {
    if (isDevelopment) {
        return import.meta.env.VITE_API_URL || 'http://localhost:8600/api';
    }
    // In production, use the production API URL
    return 'https://api.satwaraa.dev/api';
}

/**
 * Get the WebSocket URL
 * In development: uses VITE_WS_URL or VITE_API_URL or falls back to localhost
 * In production: uses the production API domain for WebSocket
 */
export function getWsUrl(): string {
    if (isDevelopment) {
        return (
            import.meta.env.VITE_WS_URL ||
            import.meta.env.VITE_API_URL?.replace('/api', '') ||
            'http://localhost:8600'
        );
    }
    // In production, use the production API domain for WebSocket
    return 'https://api.satwaraa.dev';
}
