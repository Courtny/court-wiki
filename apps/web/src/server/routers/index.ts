import { router } from "../trpc";
import { pagesRouter } from "./pages";
import { usersRouter } from "./users";
import { assetsRouter } from "./assets";
import { searchRouter } from "./search";
import { adminRouter } from "./admin";

export const appRouter = router({
  pages: pagesRouter,
  users: usersRouter,
  assets: assetsRouter,
  search: searchRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
