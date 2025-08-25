import crypto from "node:crypto";

export interface PKCEConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface AuthorizationUrlOptions {
  scope?: string;
  state?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope?: string;
}

export class PKCE {
  private codeVerifier: string;
  private codeChallenge: string;
  private config: PKCEConfig;

  constructor(config: PKCEConfig) {
    this.config = config;
    // Generate PKCE code verifier and challenge
    this.codeVerifier = this.generateCodeVerifier();
    this.codeChallenge = this.generateCodeChallenge(this.codeVerifier);
  }

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString("base64url");
  }

  private generateCodeChallenge(verifier: string): string {
    return crypto.createHash("sha256").update(verifier).digest("base64url");
  }

  getAuthorizationUrl(options: AuthorizationUrlOptions = {}): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      code_challenge: this.codeChallenge,
      code_challenge_method: "S256",
      ...(options.scope && { scope: options.scope }),
      ...(options.state && { state: options.state }),
    });

    return `https://claude.ai/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(callbackUrl: string): Promise<TokenResponse> {
    const url = new URL(callbackUrl);
    const code = url.searchParams.get("code");

    if (!code) {
      throw new Error("No authorization code found in callback URL");
    }

    const tokenUrl = "https://claude.ai/oauth/token";
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
      code_verifier: this.codeVerifier,
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }
}

export function createPKCEClient(config: PKCEConfig): PKCE {
  return new PKCE(config);
}
