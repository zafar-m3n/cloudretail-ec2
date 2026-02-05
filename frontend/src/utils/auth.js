import jwtDecode from "jwt-decode";

const TOKEN_KEY = "cloudretail_token";

/**
 * Save JWT to localStorage
 */
export function saveToken(token) {
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Get JWT from localStorage
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

/**
 * Remove JWT from localStorage
 */
export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Decode the JWT safely.
 * Returns payload object or null if invalid.
 */
export function decodeToken(token) {
  try {
    if (!token) return null;
    return jwtDecode(token);
  } catch (err) {
    console.error("Failed to decode JWT:", err);
    return null;
  }
}

/**
 * Check if the given token is expired.
 * Returns true if expired or invalid, false otherwise.
 */
export function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  const currentTimeInSeconds = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTimeInSeconds;
}

/**
 * Get user info from the stored token.
 * This assumes your JWT payload includes standard fields like:
 *  - sub (user id)
 *  - email
 *  - full_name
 *  - role
 * Adjust based on your backend implementation.
 */
export function getUserFromToken() {
  const token = getToken();
  if (!token || isTokenExpired(token)) {
    return null;
  }

  const decoded = decodeToken(token);
  if (!decoded) return null;

  // Map whatever fields your backend encodes into the token
  return {
    id: decoded.sub || decoded.id || null,
    email: decoded.email || null,
    fullName: decoded.full_name || decoded.name || null,
    role: decoded.role || "CUSTOMER",
    raw: decoded,
  };
}
