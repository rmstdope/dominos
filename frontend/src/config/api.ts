/**
 * API Configuration
 * 
 * Uses environment variable in production, falls back to localhost in development
 */
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Helper function to construct API endpoints
 */
export function apiUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
}
