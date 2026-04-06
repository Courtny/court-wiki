"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Search, Moon, Sun, Menu, Bell, Plus } from "lucide-react";
import { useTheme } from "next-themes";

export function TopBar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <header className="flex h-16 items-center gap-4 border-b border-border bg-background px-6">
      {/* Mobile menu button */}
      <button
        type="button"
        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent lg:hidden"
        onClick={() => setMobileNavOpen((o) => !o)}
        aria-expanded={mobileNavOpen}
        aria-label="Toggle navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </form>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* New page shortcut */}
        <Link
          href="/pages/new"
          className="hidden items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:flex"
        >
          <Plus className="h-3.5 w-3.5" />
          New Page
        </Link>

        {/* Notifications placeholder */}
        <button
          type="button"
          className="relative rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {/* Notification badge */}
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
        </button>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Toggle theme"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
        </button>

        {/* User avatar / sign-in */}
        {status === "loading" ? (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground"
            aria-hidden
          >
            …
          </span>
        ) : session?.user ? (
          <div className="flex items-center gap-2">
            <span
              className="hidden max-w-[10rem] truncate text-xs text-muted-foreground sm:inline"
              title={session.user.email ?? session.user.name ?? ""}
            >
              {session.user.name ?? session.user.email ?? "Signed in"}
            </span>
            <button
              type="button"
              onClick={() => void signOut({ redirectTo: "/" })}
              className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
            aria-label="Sign in"
          >
            U
          </Link>
        )}
      </div>
    </header>
  );
}
