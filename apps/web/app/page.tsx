import { FileText, Clock, Users, BookOpen, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";

// ─── Shadcn-style Card primitives (inline for zero extra dep) ─────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-border bg-card text-card-foreground shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col space-y-1.5 p-6">{children}</div>;
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-lg font-semibold leading-none tracking-tight">
      {children}
    </h3>
  );
}

function CardDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 pt-0 ${className}`}>{children}</div>;
}

// ─── Placeholder data ─────────────────────────────────────────────────────────

const recentPages = [
  {
    id: "1",
    title: "Getting Started",
    path: "/getting-started",
    description: "Welcome to Court Wiki. Learn how to create your first page.",
    updatedAt: "2 hours ago",
    author: { name: "Alice Chen", avatar: null },
  },
  {
    id: "2",
    title: "Architecture Overview",
    path: "/docs/architecture",
    description:
      "High-level overview of the Court Wiki system architecture and components.",
    updatedAt: "Yesterday",
    author: { name: "Bob Smith", avatar: null },
  },
  {
    id: "3",
    title: "API Reference",
    path: "/docs/api",
    description: "Complete API documentation for Court Wiki integrations.",
    updatedAt: "3 days ago",
    author: { name: "Carol White", avatar: null },
  },
  {
    id: "4",
    title: "Deployment Guide",
    path: "/ops/deployment",
    description:
      "Step-by-step instructions for deploying Court Wiki to production.",
    updatedAt: "1 week ago",
    author: { name: "Dave Lee", avatar: null },
  },
  {
    id: "5",
    title: "Contributing",
    path: "/contributing",
    description: "How to contribute to Court Wiki development.",
    updatedAt: "2 weeks ago",
    author: { name: "Eve Martin", avatar: null },
  },
  {
    id: "6",
    title: "Security Policy",
    path: "/security",
    description: "Security practices, vulnerability disclosure, and hardening.",
    updatedAt: "1 month ago",
    author: { name: "Frank Zhang", avatar: null },
  },
];

const stats = [
  { label: "Total Pages", value: "248", icon: FileText },
  { label: "Recent Edits", value: "14", icon: Clock },
  { label: "Contributors", value: "32", icon: Users },
  { label: "Categories", value: "12", icon: BookOpen },
];

// ─── Page component ───────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to Court Wiki
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your team&apos;s collaborative knowledge base. Search, create, and
            share knowledge.
          </p>
        </div>
        <Link
          href="/pages/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Page
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-3 pt-6">
                <div className="rounded-md bg-primary/10 p-2">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent pages */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recently Updated</h2>
          <Link
            href="/pages"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentPages.map((page) => (
            <Card
              key={page.id}
              className="group transition-shadow hover:shadow-md"
            >
              <CardHeader>
                <CardTitle>
                  <Link
                    href={page.path}
                    className="group-hover:text-primary transition-colors"
                  >
                    {page.title}
                  </Link>
                </CardTitle>
                <CardDescription>{page.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-medium">
                      {page.author.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <span>{page.author.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {page.updatedAt}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>
            Jump to commonly accessed sections of the wiki.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Getting Started", href: "/getting-started" },
              { label: "Documentation", href: "/docs" },
              { label: "Operations", href: "/ops" },
              { label: "Security", href: "/security" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
              >
                {link.label}
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
