# @repo/claude-oauth

Purpose: Thin adapter around Anthropic OAuth PKCE helper to generate sign-in URL, exchange code, refresh tokens, and check expiry.

Status: Skeleton. Wire to `_reference/cc-oauth.ts` in a later phase.

Key Exports (planned)
- generateSignInURL()
- exchangeOAuthToken(codeWithState, verifier)
- refreshAuthToken(refreshToken)
- isTokenExpired(credentials)

