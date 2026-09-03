// Resolves the API base URL at runtime so the app works on any network with
// zero config. In the browser we mirror the host the page was opened on and
// swap to the API port — open the web app on any IP and the API resolves to the
// same IP automatically. On the server (SSR/build) we hit localhost, since the
// Next server always runs on the same machine as the API.
const API_PORT = process.env.NEXT_PUBLIC_API_PORT || '5001';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:${API_PORT}`;
  }
  return process.env.NEXT_PUBLIC_API_URL || `http://localhost:${API_PORT}`;
}
