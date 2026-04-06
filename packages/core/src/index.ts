export * from "./types.js";

// ─── Utility helpers ──────────────────────────────────────────────────────────

/**
 * Slugify a string for use in URL paths.
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Normalize a wiki page path: ensure it starts with / and has no trailing slash.
 */
export function normalizePath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized.endsWith("/") && normalized.length > 1
    ? normalized.slice(0, -1)
    : normalized;
}

/**
 * Build a flat NavigationItem list into a tree structure.
 */
import type { NavigationItem, NavigationTree } from "./types.js";

export function buildNavigationTree(
  items: NavigationItem[]
): NavigationTree[] {
  const map = new Map<string, NavigationTree>();
  const roots: NavigationTree[] = [];

  for (const item of items) {
    map.set(item.id, { ...item, children: [] });
  }

  for (const item of items) {
    const node = map.get(item.id)!;
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sort = (nodes: NavigationTree[]) => {
    nodes.sort((a, b) => a.order - b.order);
    nodes.forEach((n) => sort(n.children));
    return nodes;
  };

  return sort(roots);
}

/**
 * Format a byte size into a human-readable string.
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Generate a random API key string (hex).
 */
export function generateApiKey(length = 32): string {
  const chars = "abcdef0123456789";
  let result = "";
  for (let i = 0; i < length * 2; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Truncate a string to a maximum length with ellipsis.
 */
export function truncate(str: string, max = 200): string {
  if (str.length <= max) return str;
  return str.slice(0, max).trimEnd() + "…";
}

/**
 * Check if a string matches a PageRule pattern.
 */
import type { PageRuleMatch } from "./types.js";

export function matchesPageRule(
  path: string,
  pattern: string,
  matchType: PageRuleMatch
): boolean {
  switch (matchType) {
    case "EXACT":
      return path === pattern;
    case "START":
      return path.startsWith(pattern);
    case "END":
      return path.endsWith(pattern);
    case "REGEX":
      try {
        return new RegExp(pattern).test(path);
      } catch {
        return false;
      }
    case "TAG":
      // TAG matching is done at a higher level (query-based)
      return false;
    default:
      return false;
  }
}
