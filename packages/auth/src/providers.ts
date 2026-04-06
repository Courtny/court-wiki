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
  clientId: process.env["GITHUB_CLIENT_ID"] ?? "",
  clientSecret: process.env["GITHUB_CLIENT_SECRET"] ?? "",
});

export const gitlabProvider = GitLab({
  clientId: process.env["GITLAB_CLIENT_ID"] ?? "",
  clientSecret: process.env["GITLAB_CLIENT_SECRET"] ?? "",
});

export const googleProvider = Google({
  clientId: process.env["GOOGLE_CLIENT_ID"] ?? "",
  clientSecret: process.env["GOOGLE_CLIENT_SECRET"] ?? "",
});

export const facebookProvider = Facebook({
  clientId: process.env["FACEBOOK_CLIENT_ID"] ?? "",
  clientSecret: process.env["FACEBOOK_CLIENT_SECRET"] ?? "",
});

export const discordProvider = Discord({
  clientId: process.env["DISCORD_CLIENT_ID"] ?? "",
  clientSecret: process.env["DISCORD_CLIENT_SECRET"] ?? "",
});

export const slackProvider = Slack({
  clientId: process.env["SLACK_CLIENT_ID"] ?? "",
  clientSecret: process.env["SLACK_CLIENT_SECRET"] ?? "",
});

export const twitchProvider = Twitch({
  clientId: process.env["TWITCH_CLIENT_ID"] ?? "",
  clientSecret: process.env["TWITCH_CLIENT_SECRET"] ?? "",
});

export const microsoftProvider = MicrosoftEntraID({
  clientId: process.env["AZURE_AD_CLIENT_ID"] ?? "",
  clientSecret: process.env["AZURE_AD_CLIENT_SECRET"] ?? "",
  issuer: process.env["AZURE_AD_TENANT_ID"]
    ? `https://login.microsoftonline.com/${process.env["AZURE_AD_TENANT_ID"]}/v2.0`
    : "https://login.microsoftonline.com/common/v2.0",
});

export const auth0Provider = Auth0({
  clientId: process.env["AUTH0_CLIENT_ID"] ?? "",
  clientSecret: process.env["AUTH0_CLIENT_SECRET"] ?? "",
  issuer: process.env["AUTH0_ISSUER"] ?? "",
});

export const oktaProvider = Okta({
  clientId: process.env["OKTA_CLIENT_ID"] ?? "",
  clientSecret: process.env["OKTA_CLIENT_SECRET"] ?? "",
  issuer: process.env["OKTA_ISSUER"] ?? "",
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

  if (
    process.env["GITHUB_CLIENT_ID"] &&
    process.env["GITHUB_CLIENT_SECRET"]
  ) {
    providers.push(githubProvider);
  }
  if (
    process.env["GITLAB_CLIENT_ID"] &&
    process.env["GITLAB_CLIENT_SECRET"]
  ) {
    providers.push(gitlabProvider);
  }
  if (
    process.env["GOOGLE_CLIENT_ID"] &&
    process.env["GOOGLE_CLIENT_SECRET"]
  ) {
    providers.push(googleProvider);
  }
  if (
    process.env["FACEBOOK_CLIENT_ID"] &&
    process.env["FACEBOOK_CLIENT_SECRET"]
  ) {
    providers.push(facebookProvider);
  }
  if (
    process.env["DISCORD_CLIENT_ID"] &&
    process.env["DISCORD_CLIENT_SECRET"]
  ) {
    providers.push(discordProvider);
  }
  if (
    process.env["SLACK_CLIENT_ID"] &&
    process.env["SLACK_CLIENT_SECRET"]
  ) {
    providers.push(slackProvider);
  }
  if (
    process.env["TWITCH_CLIENT_ID"] &&
    process.env["TWITCH_CLIENT_SECRET"]
  ) {
    providers.push(twitchProvider);
  }
  if (
    process.env["AZURE_AD_CLIENT_ID"] &&
    process.env["AZURE_AD_CLIENT_SECRET"]
  ) {
    providers.push(microsoftProvider);
  }
  if (
    process.env["AUTH0_CLIENT_ID"] &&
    process.env["AUTH0_CLIENT_SECRET"] &&
    process.env["AUTH0_ISSUER"]
  ) {
    providers.push(auth0Provider);
  }
  if (
    process.env["OKTA_CLIENT_ID"] &&
    process.env["OKTA_CLIENT_SECRET"] &&
    process.env["OKTA_ISSUER"]
  ) {
    providers.push(oktaProvider);
  }

  return providers;
}
