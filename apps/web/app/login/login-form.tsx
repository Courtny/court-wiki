"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

type OAuthOption = { id: string; name: string };

function authErrorMessage(code: string | null): string | null {
  if (!code) return null;
  if (code === "Configuration") {
    return "Auth misconfigured: set AUTH_SECRET (or NEXTAUTH_SECRET) and a full GitHub OAuth pair (GITHUB_* or AUTH_GITHUB_*).";
  }
  if (code === "AccessDenied") return "Access was denied. You may not be allowed to sign in.";
  if (code === "Verification") return "The sign-in link is invalid or has expired.";
  return `Sign-in error (${code}). Try again or contact an administrator.`;
}

export function LoginForm({ oauthProviders }: { oauthProviders: OAuthOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const authErrorParam = searchParams.get("error");
  const authErrorBanner = authErrorMessage(authErrorParam);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        redirectTo: callbackUrl,
      });
      if (result?.error) {
        setError("Invalid email or password.");
        return;
      }
      if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm space-y-6 rounded-lg border border-border bg-card p-8 shadow-sm">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use your account or an OAuth provider configured for this deployment.
        </p>
      </div>

      {authErrorBanner && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {authErrorBanner}
        </p>
      )}

      {oauthProviders.length > 0 && (
        <div className="space-y-2">
          {oauthProviders.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={pending}
              onClick={() => {
                setPending(true);
                void signIn(p.id, { redirectTo: callbackUrl });
              }}
              className="flex w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
            >
              Continue with {p.name}
            </button>
          ))}
        </div>
      )}

      {oauthProviders.length > 0 && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or</span>
          </div>
        </div>
      )}

      <form onSubmit={onCredentialsSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in with email"}
        </button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/" className="underline underline-offset-4 hover:text-foreground">
          Back to home
        </Link>
      </p>
    </div>
  );
}
