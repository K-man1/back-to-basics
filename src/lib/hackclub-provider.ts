import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";

// Hack Club Auth isn't a built-in Auth.js provider, so this wires up the
// OAuth 2.0 flow by hand per https://auth.hackclub.com/docs/oauth-guide.
export interface HackClubProfile extends Record<string, unknown> {
  sub: string;
  slack_id?: string;
  name?: string;
  email?: string;
  verification_status?: string;
  ysws_eligible?: boolean;
}

export default function HackClub(
  config: OAuthUserConfig<HackClubProfile>,
): OAuthConfig<HackClubProfile> {
  return {
    ...config,
    id: "hackclub",
    name: "Hack Club",
    // OIDC (not plain "oauth"): the id_token Hack Club returns already
    // carries sub/email/name/slack_id/verification_status, so Auth.js can
    // use those decoded claims directly instead of a separate userinfo call
    // with an unknown response shape.
    type: "oidc",
    issuer: "https://auth.hackclub.com",
    checks: ["pkce", "state"],
    authorization: {
      url: "https://auth.hackclub.com/oauth/authorize",
      params: { scope: "openid profile email name verification_status slack_id" },
    },
    token: "https://auth.hackclub.com/oauth/token",
    userinfo: "https://auth.hackclub.com/api/v1/me",
    profile(profile) {
      return {
        id: profile.sub,
        name: profile.name ?? null,
        email: profile.email ?? null,
        image: null,
      };
    },
  };
}
