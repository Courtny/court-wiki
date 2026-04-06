import { Suspense } from "react";
import { getActiveProviders } from "@court-wiki/auth";
import { LoginForm } from "./login-form";

function LoginFormFallback() {
  return (
    <div className="mx-auto w-full max-w-sm animate-pulse rounded-lg border border-border bg-card p-8">
      <div className="h-8 w-40 rounded bg-muted" />
      <div className="mt-4 h-4 w-full rounded bg-muted" />
    </div>
  );
}

export default function LoginPage() {
  const providers = getActiveProviders();
  const oauthProviders = providers
    .filter((p) => p.id !== "credentials")
    .map((p) => ({ id: p.id, name: p.name ?? p.id }));

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm oauthProviders={oauthProviders} />
      </Suspense>
    </div>
  );
}
