import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/src/server/routers/index";
import { createTRPCContext } from "@/src/server/trpc";
import type { NextRequest } from "next/server";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req }),
    ...(process.env["NODE_ENV"] === "development" && {
      onError: ({ path, error }: { path?: string; error: Error }) => {
        console.error(`tRPC error on ${path ?? "<no-path>"}: ${error.message}`);
      },
    }),
  });

export { handler as GET, handler as POST };
