declare global {
  interface Window {
    __APP_CONFIG__?: { API_URL?: string };
    APP_CONFIG?: { API_URL?: string };
  }
}

const runtimeApiUrl = typeof window !== 'undefined'
  ? (window.__APP_CONFIG__?.API_URL ?? window.APP_CONFIG?.API_URL)
  : undefined;

export const API_URL =
  (runtimeApiUrl !== undefined ? runtimeApiUrl : undefined) ??
  (import.meta as any).env?.VITE_API_URL ??
  '';
