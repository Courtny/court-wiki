import { z } from "zod";
import { router, adminProcedure } from "../trpc";

export const adminRouter = router({
  // ─── System statistics ────────────────────────────────────────────────────────
  stats: adminProcedure.query(async ({ ctx }) => {
    const [
      totalPages,
      totalUsers,
      totalAssets,
      totalGroups,
      recentPages,
      recentUsers,
    ] = await Promise.all([
      ctx.db.page.count(),
      ctx.db.user.count(),
      ctx.db.asset.count(),
      ctx.db.group.count(),
      ctx.db.page.findMany({
        take: 5,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          path: true,
          updatedAt: true,
          author: { select: { name: true } },
        },
      }),
      ctx.db.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totals: {
        pages: totalPages,
        users: totalUsers,
        assets: totalAssets,
        groups: totalGroups,
      },
      recentPages,
      recentUsers,
    };
  }),

  // ─── Group management ─────────────────────────────────────────────────────────
  listGroups: adminProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        perPage: z.number().int().positive().max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.perPage;

      const [items, total] = await Promise.all([
        ctx.db.group.findMany({
          skip,
          take: input.perPage,
          orderBy: { name: "asc" },
          include: { _count: { select: { users: true, pageRules: true } } },
        }),
        ctx.db.group.count(),
      ]);

      return {
        items,
        total,
        page: input.page,
        perPage: input.perPage,
        totalPages: Math.ceil(total / input.perPage),
      };
    }),

  createGroup: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        permissions: z.record(z.unknown()).default({}),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.group.create({ data: input });
    }),

  updateGroup: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        permissions: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.group.update({ where: { id }, data });
    }),

  deleteGroup: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.group.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // ─── Group membership ─────────────────────────────────────────────────────────
  addUserToGroup: adminProcedure
    .input(z.object({ userId: z.string(), groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.groupUser.create({ data: input });
    }),

  removeUserFromGroup: adminProcedure
    .input(z.object({ userId: z.string(), groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.groupUser.delete({
        where: {
          userId_groupId: { userId: input.userId, groupId: input.groupId },
        },
      });
      return { success: true };
    }),

  // ─── Navigation management ────────────────────────────────────────────────────
  getNavigation: adminProcedure
    .input(z.object({ locale: z.string().default("en") }))
    .query(async ({ ctx, input }) => {
      return ctx.db.navigationItem.findMany({
        where: { locale: input.locale, parentId: null },
        orderBy: { order: "asc" },
        include: {
          children: {
            orderBy: { order: "asc" },
            include: {
              children: { orderBy: { order: "asc" } },
            },
          },
        },
      });
    }),

  createNavItem: adminProcedure
    .input(
      z.object({
        type: z.enum(["PAGE", "LINK", "HEADER", "DIVIDER"]),
        label: z.string().min(1).max(100),
        icon: z.string().optional(),
        path: z.string().optional(),
        pageId: z.string().optional(),
        parentId: z.string().optional(),
        order: z.number().int().min(0).default(0),
        locale: z.string().default("en"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.navigationItem.create({ data: input });
    }),

  updateNavItem: adminProcedure
    .input(
      z.object({
        id: z.string(),
        label: z.string().min(1).max(100).optional(),
        icon: z.string().optional().nullable(),
        path: z.string().optional().nullable(),
        pageId: z.string().optional().nullable(),
        parentId: z.string().optional().nullable(),
        order: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.navigationItem.update({ where: { id }, data });
    }),

  deleteNavItem: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.navigationItem.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // ─── Page rules ───────────────────────────────────────────────────────────────
  listPageRules: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.pageRule.findMany({
      orderBy: { id: "asc" },
      include: { group: { select: { id: true, name: true } } },
    });
  }),

  createPageRule: adminProcedure
    .input(
      z.object({
        match: z.enum(["START", "END", "REGEX", "TAG", "EXACT"]),
        pattern: z.string().min(1),
        permissions: z.record(z.unknown()).default({}),
        groupId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.pageRule.create({ data: input });
    }),

  deletePageRule: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.pageRule.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // ─── API keys ─────────────────────────────────────────────────────────────────
  listApiKeys: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }),

  createApiKey: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        userId: z.string(),
        permissions: z.record(z.unknown()).default({}),
        expiration: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { generateApiKey } = await import("@court-wiki/core");
      const { createHash } = await import("crypto");

      const rawKey = generateApiKey(32);
      const keyHash = createHash("sha256").update(rawKey).digest("hex");

      const apiKey = await ctx.db.apiKey.create({
        data: {
          name: input.name,
          keyHash,
          userId: input.userId,
          permissions: input.permissions,
          expiration: input.expiration ?? null,
        },
      });

      // Return raw key only once — it cannot be retrieved later
      return { ...apiKey, rawKey };
    }),

  revokeApiKey: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.apiKey.update({
        where: { id: input.id },
        data: { isActive: false },
      });
      return { success: true };
    }),
});
