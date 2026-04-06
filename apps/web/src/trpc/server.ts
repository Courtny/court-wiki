import "server-only";

import { createCallerFactory, createTRPCContext } from "@/src/server/trpc";
import { appRouter } from "@/src/server/routers/index";
import { cache } from "react";

/**
 * Create a server-side tRPC caller. Cached per-request using React's cache().
 * Use this in Server Components to call tRPC procedures directly without HTTP.
 *
 * @example
 * ```tsx
 * // In a Server Component:
 * const trpc = await createServerCaller();
 * const pages = await trpc.pages.list({ page: 1, perPage: 10 });
 * ```
 */
export const createServerCaller = cache(async () => {
  // Server-side context: no request object available in RSC
  // Pass a mock request with headers from next/headers
  const { headers } = await import("next/headers");
  const headerList = await headers();

  const mockReq = new Request("http://internal/trpc", {
    headers: headerList,
  });

  const ctx = await createTRPCContext({
    req: mockReq as import("next/server").NextRequest,
  });

  const caller = createCallerFactory(appRouter)(ctx);
  return caller;
});
