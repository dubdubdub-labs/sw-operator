import { createHash, randomBytes } from "node:crypto";
import { OAuthError } from "./errors/oauth.error";

const CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const AUTH_ENDPOINT = "https://claude.ai/oauth/authorize";
const TOKEN_ENDPOINT = "https://console.anthropic.com/v1/oauth/token";
const REDIRECT_URI = "https://console.anthropic.com/oauth/code/callback";

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  account: { email_address: string };
};

export type Credentials = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  email: string;
  scope: string;
};

const toBase64Url = (buf: Buffer) => buf.toString("base64url");

const pkce = () => {
  const verifier = toBase64Url(randomBytes(32));
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
};

const assertTokenResponse = (data: unknown): TokenResponse => {
  if (
    typeof data === "object" &&
    data !== null &&
    typeof (data as { access_token?: unknown }).access_token === "string" &&
    typeof (data as { refresh_token?: unknown }).refresh_token === "string" &&
    typeof (data as { expires_in?: unknown }).expires_in === "number" &&
    typeof (data as { scope?: unknown }).scope === "string" &&
    typeof (data as { account?: unknown }).account === "object" &&
    (data as { account: { email_address?: unknown } }).account !== null &&
    typeof (data as { account: { email_address?: unknown } }).account
      .email_address === "string"
  ) {
    return data as TokenResponse;
  }
  throw new OAuthError(
    "UNEXPECTED_RESPONSE",
    "OAuth token response did not match expected shape",
    data
  );
};

export const generateSignInURL = () => {
  const { verifier, challenge } = pkce();

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    code: "true",
    code_challenge: challenge,
    code_challenge_method: "S256",
    scope: ["user:inference", "user:profile"].join(" "),
    state: verifier,
  });

  return { authURL: `${AUTH_ENDPOINT}?${params.toString()}`, verifier };
};

export async function exchangeOAuthToken(
  codeWithState: string,
  verifier: string
): Promise<Credentials> {
  const [code, state] = codeWithState.split("#");
  if (!code || state !== verifier) {
    throw new OAuthError(
      "INVALID_STATE",
      "Invalid code or state returned from OAuth flow"
    );
  }

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      state,
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    throw new OAuthError(
      "HTTP_ERROR",
      `Token exchange failed (${res.status})`,
      body
    );
  }

  const data = assertTokenResponse(await res.json());
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    email: data.account.email_address,
    scope: data.scope,
  };
}

export async function refreshAuthToken(
  refresh_token: string
): Promise<Credentials> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: CLIENT_ID,
      refresh_token,
    }),
  });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    throw new OAuthError(
      "HTTP_ERROR",
      `Token refresh failed (${res.status})`,
      body
    );
  }

  const data = assertTokenResponse(await res.json());
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    email: data.account.email_address,
    scope: data.scope,
  };
}

export const isTokenExpired = (c: { expires_at: number }) =>
  Date.now() >= c.expires_at - 10 * 60_000; // refresh 10 min early

export const anthropicHeaders = (access_token: string) => ({
  "User-Agent": "claude-cli/1.0.30 (external, cli)",
  Authorization: `Bearer ${access_token}`,
  "anthropic-beta": "oauth-2025-04-20",
});

export * as errors from "./errors";
export {
  createPKCEClient,
  PKCE,
  type PKCEConfig,
  type TokenResponse,
} from "./pkce";
