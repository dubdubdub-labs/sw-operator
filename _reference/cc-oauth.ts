/**
 * Anthropic OAuth helper (no external deps)
 * -------------------------------------------------------------
 *    Usage:
 *     import * as AnthropicAuth from './anthropic-oauth'
 *
 *     // 1. First‑time sign‑in
 *     const { authURL, verifier } = AnthropicAuth.generateSignInURL()
 *     console.log('Open:', authURL)
 *
 *     // 2. After login, paste the returned "code#state" here:
 *     const tokens = await AnthropicAuth.exchangeOAuthToken(authCodeWithState, verifier)
 *
 *     // 3. Save tokens somewhere secure (see example.ts)
 *
 *     // 4. Refresh when close to expiry
 *     if (AnthropicAuth.isTokenExpired(tokens)) {
 *       const refreshed = await AnthropicAuth.refreshAuthToken(tokens.refresh_token)
 *     }
 * ------------------------------------------------------------
 */

import crypto from 'crypto';

const CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
const AUTH_ENDPOINT = 'https://claude.ai/oauth/authorize';
const TOKEN_ENDPOINT = 'https://console.anthropic.com/v1/oauth/token';
const REDIRECT_URI  = 'https://console.anthropic.com/oauth/code/callback';

type TokenResp = {
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

export const generateSignInURL = () => {
  // ---- PKCE helper ----------------------------------------
  const random = (len = 32) => crypto.randomBytes(len).toString('base64url');
  const verifier  = random();
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    code: 'true',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    scope: ['user:inference', 'user:profile'].join(' '),
    state: verifier
  });

  return { authURL: `${AUTH_ENDPOINT}?${params}`, verifier };
};

export async function exchangeOAuthToken(codeWithState: string, verifier: string): Promise<Credentials> {
  const [code, state] = codeWithState.split('#');
  if (!code || state !== verifier) throw new Error('Invalid code or state');

  const body = {
    code,
    state,
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier
  };

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as TokenResp;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    email: data.account.email_address,
    scope: data.scope
  };
}

export async function refreshAuthToken(refresh_token: string): Promise<Credentials> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      refresh_token
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Refresh failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as TokenResp;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    email: data.account.email_address,
    scope: data.scope
  };
}

export const isTokenExpired = (c: { expires_at: number }) =>
  Date.now() >= c.expires_at - 10 * 60_000; // refresh 10 min before expiry

export const anthropicHeaders = (access_token: string) => ({
  'User-Agent': 'claude-cli/1.0.30 (external, cli)',
  'Authorization': `Bearer ${access_token}`,
  'anthropic-beta': 'oauth-2025-04-20'
});