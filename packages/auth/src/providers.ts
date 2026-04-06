import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import GitLab from "next-auth/providers/gitlab";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import Discord from "next-auth/providers/discord";
import Slack from "next-auth/providers/slack";
import Twitch from "next-auth/providers/twitch";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Auth0 from "next-auth/providers/auth0";
import Okta from "next-auth/providers/okta";
import type { Provider } from "next-auth/providers";
import { prisma } from "@court-wiki/db";
import { compare } from "bcryptjs";

/** Prefer legacy COURT_WIKI names, then Auth.js v5 `AUTH_{PROVIDER}_{ID|SECRET}` inference names. */
function envFirst(...keys: string[]): string {
  for (const k of keys) {
    const v = process.env[k];
    if (v != null && v !== "") return v;
  }
  return "";
}

function hasOAuthPair(idKeys: [string, string], secretKeys: [string, string]): boolean {
  return !!(envFirst(...idKeys) && envFirst(...secretKeys));
}

// ─── Credentials (local username/password) ────────────────────────────────────

export const credentialsProvider = Credentials({
  name: "Email & Password",
  credentials: {
    email: { label: "Email", type: "email", placeholder: "you@example.com" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) return null;

    const email =
      typeof credentials.email === "string" ? credentials.email : "";
    const password =
      typeof credentials.password === "string" ? credentials.password : "";

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || !user.isActive) return null;

    const valid = await compare(password, user.passwordHash);
    if (!valid) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.avatar,
    };
  },
});

// ─── OAuth Providers ──────────────────────────────────────────────────────────

export const githubProvider = GitHub({
  clientId: envFirst("GITHUB_CLIENT_ID", "AUTH_GITHUB_ID"),
  clientSecret: envFirst("GITHUB_CLIENT_SECRET", "AUTH_GITHUB_SECRET"),
});

export const gitlabProvider = GitLab({
  clientId: envFirst("GITLAB_CLIENT_ID", "AUTH_GITLAB_ID"),
  clientSecret: envFirst("GITLAB_CLIENT_SECRET", "AUTH_GITLAB_SECRET"),
});

export const googleProvider = Google({
  clientId: envFirst("GOOGLE_CLIENT_ID", "AUTH_GOOGLE_ID"),
  clientSecret: envFirst("GOOGLE_CLIENT_SECRET", "AUTH_GOOGLE_SECRET"),
});

export const facebookProvider = Facebook({
  clientId: envFirst("FACEBOOK_CLIENT_ID", "AUTH_FACEBOOK_ID"),
  clientSecret: envFirst("FACEBOOK_CLIENT_SECRET", "AUTH_FACEBOOK_SECRET"),
});

export const discordProvider = Discord({
  clientId: envFirst("DISCORD_CLIENT_ID", "AUTH_DISCORD_ID"),
  clientSecret: envFirst("DISCORD_CLIENT_SECRET", "AUTH_DISCORD_SECRET"),
});

export const slackProvider = Slack({
  clientId: envFirst("SLACK_CLIENT_ID", "AUTH_SLACK_ID"),
  clientSecret: envFirst("SLACK_CLIENT_SECRET", "AUTH_SLACK_SECRET"),
});

export const twitchProvider = Twitch({
  clientId: envFirst("TWITCH_CLIENT_ID", "AUTH_TWITCH_ID"),
  clientSecret: envFirst("TWITCH_CLIENT_SECRET", "AUTH_TWITCH_SECRET"),
});

const msTenant = envFirst("AZURE_AD_TENANT_ID", "AUTH_MICROSOFT_ENTRA_TENANT_ID");

export const microsoftProvider = MicrosoftEntraID({
  clientId: envFirst("AZURE_AD_CLIENT_ID", "AUTH_MICROSOFT_ENTRA_ID"),
  clientSecret: envFirst("AZURE_AD_CLIENT_SECRET", "AUTH_MICROSOFT_ENTRA_SECRET"),
  issuer: msTenant
    ? `https://login.microsoftonline.com/${msTenant}/v2.0`
    : "https://login.microsoftonline.com/common/v2.0",
});

export const auth0Provider = Auth0({
  clientId: envFirst("AUTH0_CLIENT_ID", "AUTH_AUTH0_ID"),
  clientSecret: envFirst("AUTH0_CLIENT_SECRET", "AUTH_AUTH0_SECRET"),
  issuer: envFirst("AUTH0_ISSUER", "AUTH_AUTH0_ISSUER"),
});

export const oktaProvider = Okta({
  clientId: envFirst("OKTA_CLIENT_ID", "AUTH_OKTA_ID"),
  clientSecret: envFirst("OKTA_CLIENT_SECRET", "AUTH_OKTA_SECRET"),
  issuer: envFirst("OKTA_ISSUER", "AUTH_OKTA_ISSUER"),
});

// ─── SAML / LDAP stubs ───────────────────────────────────────────────────────
//
// SAML support requires the `@auth/saml-provider` package (enterprise).
// To enable: install `@node-saml/passport-saml` and configure accordingly.
//
// LDAP/Active Directory requires `ldapjs` or `passport-ldapauth`.
// Implement a custom Credentials provider that performs an LDAP bind:
//
//   import ldap from "ldapjs";
//   export const ldapProvider = Credentials({
//     name: "LDAP",
//     credentials: { username: { label: "Username" }, password: { label: "Password", type: "password" } },
//     async authorize({ username, password }) {
//       return authenticateWithLDAP(username, password, {
//         url: process.env.LDAP_URL,
//         bindDN: process.env.LDAP_BIND_DN,
//         bindCredentials: process.env.LDAP_BIND_CREDENTIALS,
//         searchBase: process.env.LDAP_SEARCH_BASE,
//         searchFilter: process.env.LDAP_SEARCH_FILTER,
//       });
//     },
//   });

// ─── Active providers list ────────────────────────────────────────────────────
//
// Only providers with their env vars set will actually work.
// The factory filters at runtime based on the presence of required env keys.

export function getActiveProviders(): Provider[] {
  const providers: Provider[] = [credentialsProvider];

  if (hasOAuthPair(["GITHUB_CLIENT_ID", "AUTH_GITHUB_ID"], ["GITHUB_CLIENT_SECRET", "AUTH_GITHUB_SECRET"])) {
    providers.push(githubProvider);
  }
  if (hasOAuthPair(["GITLAB_CLIENT_ID", "AUTH_GITLAB_ID"], ["GITLAB_CLIENT_SECRET", "AUTH_GITLAB_SECRET"])) {
    providers.push(gitlabProvider);
  }
  if (hasOAuthPair(["GOOGLE_CLIENT_ID", "AUTH_GOOGLE_ID"], ["GOOGLE_CLIENT_SECRET", "AUTH_GOOGLE_SECRET"])) {
    providers.push(googleProvider);
  }
  if (hasOAuthPair(["FACEBOOK_CLIENT_ID", "AUTH_FACEBOOK_ID"], ["FACEBOOK_CLIENT_SECRET", "AUTH_FACEBOOK_SECRET"])) {
    providers.push(facebookProvider);
  }
  if (hasOAuthPair(["DISCORD_CLIENT_ID", "AUTH_DISCORD_ID"], ["DISCORD_CLIENT_SECRET", "AUTH_DISCORD_SECRET"])) {
    providers.push(discordProvider);
  }
  if (hasOAuthPair(["SLACK_CLIENT_ID", "AUTH_SLACK_ID"], ["SLACK_CLIENT_SECRET", "AUTH_SLACK_SECRET"])) {
    providers.push(slackProvider);
  }
  if (hasOAuthPair(["TWITCH_CLIENT_ID", "AUTH_TWITCH_ID"], ["TWITCH_CLIENT_SECRET", "AUTH_TWITCH_SECRET"])) {
    providers.push(twitchProvider);
  }
  if (
    hasOAuthPair(
      ["AZURE_AD_CLIENT_ID", "AUTH_MICROSOFT_ENTRA_ID"],
      ["AZURE_AD_CLIENT_SECRET", "AUTH_MICROSOFT_ENTRA_SECRET"]
    )
  ) {
    providers.push(microsoftProvider);
  }
  if (
    envFirst("AUTH0_CLIENT_ID", "AUTH_AUTH0_ID") &&
    envFirst("AUTH0_CLIENT_SECRET", "AUTH_AUTH0_SECRET") &&
    envFirst("AUTH0_ISSUER", "AUTH_AUTH0_ISSUER")
  ) {
    providers.push(auth0Provider);
  }
  if (
    envFirst("OKTA_CLIENT_ID", "AUTH_OKTA_ID") &&
    envFirst("OKTA_CLIENT_SECRET", "AUTH_OKTA_SECRET") &&
    envFirst("OKTA_ISSUER", "AUTH_OKTA_ISSUER")
  ) {
    providers.push(oktaProvider);
  }

  return providers;
}
