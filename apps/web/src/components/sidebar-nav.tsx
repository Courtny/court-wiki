"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  BookOpen,
  FileText,
  Search,
  Settings,
  Upload,
  Users,
  Home,
  ChevronRight,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: Array<{ label: string; href: string }>;
}

const navItems: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Browse Pages", href: "/pages", icon: FileText },
  { label: "Search", href: "/search", icon: Search },
  {
    label: "Documentation",
    href: "/docs",
    icon: BookOpen,
    children: [
      { label: "Getting Started", href: "/getting-started" },
      { label: "Architecture", href: "/docs/architecture" },
      { label: "API Reference", href: "/docs/api" },
    ],
  },
  { label: "Assets", href: "/assets", icon: Upload },
];

const adminNavItems: NavItem[] = [
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

function NavLink({
  item,
  depth = 0,
  isLoggedIn = false,
}: {
  item: NavItem;
  depth?: number;
  isLoggedIn?: boolean;
}) {
  const pathname = usePathname();
  const isActive =
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href || pathname.startsWith(item.href + "/");

  const Icon = item.icon;

  // Don't prefetch auth-required links for unauthenticated users — avoids
  // the middleware redirect flood that generates dozens of 307s per page load.
  const prefetch = isLoggedIn ? undefined : false;

  return (
    <div>
      <Link
        href={item.href}
        prefetch={prefetch}
        className={[
          "sidebar-link",
          isActive ? "active" : "",
          depth > 0 ? "pl-8 text-xs" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {depth === 0 ? (
          <Icon className="h-4 w-4 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
        )}
        <span className="truncate">{item.label}</span>
      </Link>

      {item.children && isActive && (
        <div className="mt-0.5 space-y-0.5">
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              prefetch={prefetch}
              className={[
                "sidebar-link pl-8 text-xs",
                pathname === child.href ? "active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <ChevronRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function SidebarNav() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";
  const isAdmin =
    isLoggedIn &&
    !!(session?.user as (typeof session.user & { isAdmin?: boolean }) | undefined)?.isAdmin;

  return (
    <nav className="space-y-1">
      {/* Main navigation */}
      {navItems.map((item) => (
        <NavLink key={item.href} item={item} isLoggedIn={isLoggedIn} />
      ))}

      {/* Admin section — only rendered for admins */}
      {isAdmin && (
        <>
          <div className="my-3 border-t border-border" />
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Administration
          </p>
          {adminNavItems.map((item) => (
            <NavLink key={item.href} item={item} isLoggedIn={isLoggedIn} />
          ))}
        </>
      )}
    </nav>
  );
}
