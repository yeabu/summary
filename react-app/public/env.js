// Dev fallback for runtime config
// Vite dev server serves files in /public at root, so this avoids 404 for /env.js
// For local development, we usually proxy /api to backend via vite.config.ts,
// so keeping API_URL empty means same-origin requests to /api (proxied).
window.__APP_CONFIG__ = {
  API_URL: ""
};

