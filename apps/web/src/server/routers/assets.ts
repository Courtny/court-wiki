import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "../trpc";

export const assetsRouter = router({
  // ─── List assets in a folder ──────────────────────────────────────────────────
  list: protectedProcedure
    .input(
      z.object({
        folderId: z.string().optional(),
        page: z.number().int().positive().default(1),
        perPage: z.number().int().positive().max(100).default(40),
        mimeType: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.perPage;

      const where = {
        folderId: input.folderId ?? null,
        ...(input.mimeType && {
          mimeType: { startsWith: input.mimeType },
        }),
      };

      const [items, total] = await Promise.all([
        ctx.db.asset.findMany({
          where,
          skip,
          take: input.perPage,
          orderBy: { createdAt: "desc" },
          include: {
            author: { select: { id: true, name: true } },
            folder: { select: { id: true, name: true, slug: true } },
          },
        }),
        ctx.db.asset.count({ where }),
      ]);

      return {
        items,
        total,
        page: input.page,
        perPage: input.perPage,
        totalPages: Math.ceil(total / input.perPage),
      };
    }),

  // ─── Get asset by ID ──────────────────────────────────────────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const asset = await ctx.db.asset.findUnique({
        where: { id: input.id },
        include: {
          author: { select: { id: true, name: true } },
          folder: true,
        },
      });

      if (!asset) throw new TRPCError({ code: "NOT_FOUND" });
      return asset;
    }),

  // ─── Create asset record (after file upload to storage) ───────────────────────
  create: protectedProcedure
    .input(
      z.object({
        filename: z.string().min(1),
        ext: z.string(),
        fileSize: z.number().int().positive(),
        mimeType: z.string(),
        folderId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const authorId = (ctx.user as typeof ctx.user & { id: string }).id;

      return ctx.db.asset.create({
        data: {
          ...input,
          authorId,
        },
        include: {
          folder: { select: { id: true, name: true, slug: true } },
        },
      });
    }),

  // ─── Delete asset ─────────────────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as typeof ctx.user & { id: string }).id;
      const isAdmin = (
        ctx.user as typeof ctx.user & { isAdmin?: boolean }
      ).isAdmin;

      const asset = await ctx.db.asset.findUnique({ where: { id: input.id } });
      if (!asset) throw new TRPCError({ code: "NOT_FOUND" });

      if (asset.authorId !== userId && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await ctx.db.asset.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // ─── List folders ─────────────────────────────────────────────────────────────
  listFolders: protectedProcedure
    .input(
      z.object({
        parentId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.assetFolder.findMany({
        where: { parentId: input.parentId ?? null },
        orderBy: { name: "asc" },
        include: {
          _count: { select: { assets: true, children: true } },
        },
      });
    }),

  // ─── Create folder ────────────────────────────────────────────────────────────
  createFolder: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        parentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      // Ensure slug uniqueness within parent
      const existing = await ctx.db.assetFolder.findFirst({
        where: { slug, parentId: input.parentId ?? null },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A folder named "${input.name}" already exists here.`,
        });
      }

      return ctx.db.assetFolder.create({
        data: {
          name: input.name,
          slug,
          parentId: input.parentId ?? null,
        },
      });
    }),

  // ─── Delete folder (admin only) ───────────────────────────────────────────────
  deleteFolder: adminProcedure
    .input(z.object({ id: z.string(), force: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const folder = await ctx.db.assetFolder.findUnique({
        where: { id: input.id },
        include: { _count: { select: { assets: true, children: true } } },
      });

      if (!folder) throw new TRPCError({ code: "NOT_FOUND" });

      if (
        !input.force &&
        (folder._count.assets > 0 || folder._count.children > 0)
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Folder is not empty. Use force=true to delete along with all contents.",
        });
      }

      await ctx.db.assetFolder.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
