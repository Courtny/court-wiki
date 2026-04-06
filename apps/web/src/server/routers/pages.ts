import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "../trpc";

const contentTypeSchema = z.enum(["MARKDOWN", "ASCIIDOC", "HTML"]);

const pageCreateSchema = z.object({
  path: z
    .string()
    .min(1)
    .regex(/^[a-z0-9/_-]+$/, "Path must only contain lowercase letters, numbers, dashes, underscores, and slashes"),
  title: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  content: z.string(),
  contentType: contentTypeSchema.default("MARKDOWN"),
  locale: z.string().default("en"),
  isPublished: z.boolean().default(false),
  isPrivate: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
});

const pageUpdateSchema = pageCreateSchema
  .partial()
  .omit({ path: true })
  .extend({
    id: z.string(),
    path: z.string().optional(),
  });

export const pagesRouter = router({
  // ─── List pages (paginated) ──────────────────────────────────────────────────
  list: publicProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        perPage: z.number().int().positive().max(100).default(20),
        locale: z.string().optional(),
        isPublished: z.boolean().optional(),
        tag: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.perPage;

      const where = {
        ...(input.locale && { locale: input.locale }),
        ...(input.isPublished !== undefined && {
          isPublished: input.isPublished,
        }),
        // Non-admins can only see published, non-private pages
        ...(!ctx.session?.user && { isPublished: true, isPrivate: false }),
        ...(input.tag && {
          tags: { some: { tag: { name: input.tag } } },
        }),
        ...(input.search && {
          OR: [
            { title: { contains: input.search, mode: "insensitive" as const } },
            {
              description: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }),
      };

      const [items, total] = await Promise.all([
        ctx.db.page.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip,
          take: input.perPage,
          include: {
            author: { select: { id: true, name: true, avatar: true } },
            tags: { include: { tag: true } },
          },
        }),
        ctx.db.page.count({ where }),
      ]);

      return {
        items,
        total,
        page: input.page,
        perPage: input.perPage,
        totalPages: Math.ceil(total / input.perPage),
      };
    }),

  // ─── Get page by path ────────────────────────────────────────────────────────
  get: publicProcedure
    .input(
      z.object({
        path: z.string(),
        locale: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const page = await ctx.db.page.findUnique({
        where: { path: input.path },
        include: {
          author: { select: { id: true, name: true, avatar: true } },
          tags: { include: { tag: true } },
          _count: { select: { versions: true, comments: true } },
        },
      });

      if (!page) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Page not found: ${input.path}`,
        });
      }

      // Private pages require authentication
      if (page.isPrivate && !ctx.session?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "This page is private. Please sign in.",
        });
      }

      // Unpublished pages require the author or admin
      if (!page.isPublished) {
        const user = ctx.session?.user as
          | ({ isAdmin?: boolean; id?: string } & Record<string, unknown>)
          | undefined;
        if (!user || (user.id !== page.authorId && !user.isAdmin)) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Page not found: ${input.path}`,
          });
        }
      }

      return page;
    }),

  // ─── Create page ─────────────────────────────────────────────────────────────
  create: protectedProcedure
    .input(pageCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { tags, ...pageData } = input;

      // Check path uniqueness
      const existing = await ctx.db.page.findUnique({
        where: { path: input.path },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A page already exists at path: ${input.path}`,
        });
      }

      const authorId = (
        ctx.user as typeof ctx.user & { id: string }
      ).id;

      const page = await ctx.db.page.create({
        data: {
          ...pageData,
          authorId,
          tags: tags?.length
            ? {
                create: tags.map((name) => ({
                  tag: {
                    connectOrCreate: {
                      where: { name },
                      create: { name },
                    },
                  },
                })),
              }
            : undefined,
        },
        include: {
          author: { select: { id: true, name: true, avatar: true } },
          tags: { include: { tag: true } },
        },
      });

      // Create initial version
      await ctx.db.pageVersion.create({
        data: {
          pageId: page.id,
          content: page.content,
          authorId,
          action: "create",
        },
      });

      return page;
    }),

  // ─── Update page ─────────────────────────────────────────────────────────────
  update: protectedProcedure
    .input(pageUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, tags, ...updateData } = input;
      const userId = (ctx.user as typeof ctx.user & { id: string }).id;
      const isAdmin = (
        ctx.user as typeof ctx.user & { isAdmin?: boolean }
      ).isAdmin;

      const page = await ctx.db.page.findUnique({ where: { id } });
      if (!page) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }

      if (page.authorId !== userId && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to edit this page.",
        });
      }

      // If path is being changed, check it's available
      if (updateData.path && updateData.path !== page.path) {
        const conflict = await ctx.db.page.findUnique({
          where: { path: updateData.path },
        });
        if (conflict) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Path already taken: ${updateData.path}`,
          });
        }
      }

      const updated = await ctx.db.$transaction(async (tx) => {
        // Save version before update
        await tx.pageVersion.create({
          data: {
            pageId: page.id,
            content: page.content,
            authorId: userId,
            action: "update",
          },
        });

        // Replace tags if provided
        if (tags !== undefined) {
          await tx.pageTag.deleteMany({ where: { pageId: id } });
        }

        return tx.page.update({
          where: { id },
          data: {
            ...updateData,
            ...(tags !== undefined && {
              tags: {
                create: tags.map((name) => ({
                  tag: {
                    connectOrCreate: {
                      where: { name },
                      create: { name },
                    },
                  },
                })),
              },
            }),
          },
          include: {
            author: { select: { id: true, name: true, avatar: true } },
            tags: { include: { tag: true } },
          },
        });
      });

      return updated;
    }),

  // ─── Delete page (admin soft-delete via unpublish + mark) ────────────────────
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const page = await ctx.db.page.findUnique({ where: { id: input.id } });
      if (!page) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }

      // Hard delete (cascades versions, tags, comments, search index)
      await ctx.db.page.delete({ where: { id: input.id } });

      return { success: true };
    }),

  // ─── Get version history ─────────────────────────────────────────────────────
  versions: protectedProcedure
    .input(
      z.object({
        pageId: z.string(),
        page: z.number().int().positive().default(1),
        perPage: z.number().int().positive().max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.perPage;

      const [items, total] = await Promise.all([
        ctx.db.pageVersion.findMany({
          where: { pageId: input.pageId },
          orderBy: { versionDate: "desc" },
          skip,
          take: input.perPage,
          include: {
            author: { select: { id: true, name: true, avatar: true } },
          },
        }),
        ctx.db.pageVersion.count({ where: { pageId: input.pageId } }),
      ]);

      return {
        items,
        total,
        page: input.page,
        perPage: input.perPage,
        totalPages: Math.ceil(total / input.perPage),
      };
    }),

  // ─── Restore page to a previous version ──────────────────────────────────────
  restore: protectedProcedure
    .input(
      z.object({
        pageId: z.string(),
        versionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as typeof ctx.user & { id: string }).id;
      const isAdmin = (
        ctx.user as typeof ctx.user & { isAdmin?: boolean }
      ).isAdmin;

      const [page, version] = await Promise.all([
        ctx.db.page.findUnique({ where: { id: input.pageId } }),
        ctx.db.pageVersion.findUnique({ where: { id: input.versionId } }),
      ]);

      if (!page) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      if (!version || version.pageId !== input.pageId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" });
      }
      if (page.authorId !== userId && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return ctx.db.$transaction(async (tx) => {
        // Save current content as a version before restoring
        await tx.pageVersion.create({
          data: {
            pageId: page.id,
            content: page.content,
            authorId: userId,
            action: "pre-restore",
          },
        });

        return tx.page.update({
          where: { id: input.pageId },
          data: { content: version.content },
          include: {
            author: { select: { id: true, name: true, avatar: true } },
          },
        });
      });
    }),
});
