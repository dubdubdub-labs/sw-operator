// Thin wrapper around reference OAuth helper (to be implemented later)
export type Credentials = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  email: string;
  scope: string;
};

export function generateSignInURL(): { authURL: string; verifier: string } {
  throw new Error("Not implemented: integrate reference cc-oauth.ts");
}

export function exchangeOAuthToken(
  _codeWithState: string,
  _verifier: string
): Promise<Credentials> {
  return Promise.reject(
    new Error("Not implemented: integrate reference cc-oauth.ts")
  );
}

export function refreshAuthToken(_refreshToken: string): Promise<Credentials> {
  return Promise.reject(
    new Error("Not implemented: integrate reference cc-oauth.ts")
  );
}

export const isTokenExpired = (c: { expires_at: number }) =>
  Date.now() >= c.expires_at - 10 * 60_000;
