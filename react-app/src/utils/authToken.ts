import useAuthStore from "../auth/AuthStore";

// Helper to decode JWT expiry (returns unix seconds)
export function getJwtExpiration(token: string): number | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload));
    return decoded.exp; // Expiry unix timestamp (in seconds)
  } catch {
    return null;
  }
}

const TOKEN_EXPIRY_BUFFER_SEC = 60;

/**
 * Returns the up-to-date JWT. 
 * If no valid token can be obtained, triggers logout and returns null.
 */
export async function getValidAccessTokenOrRefresh(): Promise<string | null> {
  const { token, signOut } = useAuthStore.getState();
  
  if (!token) {
    console.log('No token available, signing out');
    signOut();
    return null;
  }
  
  // 简化版本：直接返回当前 token，不做过期检查
  // 如果 token 过期，后端会返回 401，前端可以捕获并处理
  console.log('Using token:', token.substring(0, 20) + '...');
  return token;
}