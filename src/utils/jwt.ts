/**
 * Reads the `sub` (username) claim out of a JWT **without verifying the signature**.
 *
 * This is safe here because the value is only used for display (the header shows
 * the current username) — every actual authorisation decision is made server-side
 * against the `Authorization: Bearer` token. On a page reload the backend's
 * `/api/users/refresh` hands back only a fresh JWT (no username field), so this is
 * how the username is recovered.
 */
export function getUsernameFromToken(token: string): string | null {
  const payload = token.split('.')[1];
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    const claims = JSON.parse(json) as { sub?: string };
    return claims.sub ?? null;
  } catch {
    return null;
  }
}
