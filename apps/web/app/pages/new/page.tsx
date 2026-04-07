import { redirect } from "next/navigation";
import { auth } from "@court-wiki/auth";
import { NewPageForm } from "./new-page-form";

export const metadata = { title: "New Page" };

export default async function NewPagePage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/pages/new");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Page</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a new wiki page. Use Markdown for formatting.
        </p>
      </div>
      <NewPageForm />
    </div>
  );
}
