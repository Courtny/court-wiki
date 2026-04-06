import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { hash } from "bcryptjs";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "../trpc";

export const usersRouter = router({
  // ─── Get current user profile ────────────────────────────────────────────────
  me: protectedProcedure.query(async ({ ctx }) => {
    const userId = (ctx.user as typeof ctx.user & { id: string }).id;

    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        locale: true,
        timezone: true,
        isAdmin: true,
        isActive: true,
        createdAt: true,
        groups: {
          include: {
            group: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) throw new TRPCError({ code: "NOT_FOUND" });
    return user;
  }),

  // ─── Update own profile ───────────────────────────────────────────────────────
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        avatar: z.string().url().optional().nullable(),
        locale: z.string().length(2).optional(),
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as typeof ctx.user & { id: string }).id;

      return ctx.db.user.update({
        where: { id: userId },
        data: input,
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          locale: true,
          timezone: true,
        },
      });
    }),

  // ─── Change password ──────────────────────────────────────────────────────────
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8).max(128),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as typeof ctx.user & { id: string }).id;
      const { compare } = await import("bcryptjs");

      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
      });

      if (!user?.passwordHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This account uses external OAuth login and has no password to change.",
        });
      }

      const valid = await compare(input.currentPassword, user.passwordHash);
      if (!valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Current password is incorrect.",
        });
      }

      const newHash = await hash(input.newPassword, 12);
      await ctx.db.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      });

      return { success: true };
    }),

  // ─── Admin: list all users ────────────────────────────────────────────────────
  list: adminProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        perPage: z.number().int().positive().max(100).default(20),
        search: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.perPage;

      const where = {
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.search && {
          OR: [
            { email: { contains: input.search, mode: "insensitive" as const } },
            { name: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [items, total] = await Promise.all([
        ctx.db.user.findMany({
          where,
          skip,
          take: input.perPage,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            isActive: true,
            isAdmin: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { pages: true } },
          },
        }),
        ctx.db.user.count({ where }),
      ]);

      return {
        items,
        total,
        page: input.page,
        perPage: input.perPage,
        totalPages: Math.ceil(total / input.perPage),
      };
    }),

  // ─── Admin: get user by ID ────────────────────────────────────────────────────
  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
        include: {
          groups: { include: { group: true } },
          _count: { select: { pages: true, assets: true, comments: true } },
        },
      });

      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      // Never return password hash
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: _passwordHash, ...safeUser } = user;
      return safeUser;
    }),

  // ─── Admin: create user ───────────────────────────────────────────────────────
  create: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(1).max(100),
        password: z.string().min(8).max(128).optional(),
        isAdmin: z.boolean().default(false),
        locale: z.string().default("en"),
        timezone: z.string().default("UTC"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { password, ...data } = input;

      const existing = await ctx.db.user.findUnique({
        where: { email: input.email },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A user with that email already exists.",
        });
      }

      const passwordHash = password ? await hash(password, 12) : null;

      const user = await ctx.db.user.create({
        data: {
          ...data,
          ...(passwordHash && { passwordHash }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          isAdmin: true,
          createdAt: true,
        },
      });

      return user;
    }),

  // ─── Admin: update user ───────────────────────────────────────────────────────
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        isAdmin: z.boolean().optional(),
        isActive: z.boolean().optional(),
        locale: z.string().optional(),
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      return ctx.db.user.update({
        where: { id },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          isAdmin: true,
          isActive: true,
        },
      });
    }),

  // ─── Public: register new user (if self-registration is enabled) ──────────────
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(1).max(100),
        password: z.string().min(8).max(128),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.user.findUnique({
        where: { email: input.email },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with that email already exists.",
        });
      }

      const passwordHash = await hash(input.password, 12);

      const user = await ctx.db.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
        },
        select: { id: true, email: true, name: true },
      });

      return user;
    }),
});
