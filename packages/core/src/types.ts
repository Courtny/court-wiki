// ─── Enums ────────────────────────────────────────────────────────────────────

export type ContentType = "MARKDOWN" | "ASCIIDOC" | "HTML";

export type PageRuleMatch = "START" | "END" | "REGEX" | "TAG" | "EXACT";

export type NavigationItemType = "PAGE" | "LINK" | "HEADER" | "DIVIDER";

// ─── Permission System ────────────────────────────────────────────────────────

export interface Permission {
  read: boolean;
  write: boolean;
  manage: boolean;
  delete: boolean;
  comment: boolean;
}

export type PermissionMap = Record<string, Partial<Permission>>;

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  locale: string;
  timezone: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithGroups extends User {
  groups: GroupUser[];
}

export interface UserSession {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  isAdmin: boolean;
}

// ─── Group ────────────────────────────────────────────────────────────────────

export interface Group {
  id: string;
  name: string;
  permissions: PermissionMap;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupUser {
  userId: string;
  groupId: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export interface Page {
  id: string;
  path: string;
  title: string;
  description: string | null;
  content: string;
  contentType: ContentType;
  locale: string;
  isPublished: boolean;
  isPrivate: boolean;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PageWithAuthor extends Page {
  author: Pick<User, "id" | "name" | "email" | "avatar">;
}

export interface PageWithTags extends Page {
  tags: Array<{ tag: Tag }>;
}

export interface PageSummary {
  id: string;
  path: string;
  title: string;
  description: string | null;
  locale: string;
  isPublished: boolean;
  updatedAt: Date;
  author: Pick<User, "id" | "name" | "avatar">;
}

// ─── Page Version ─────────────────────────────────────────────────────────────

export interface PageVersion {
  id: string;
  pageId: string;
  content: string;
  versionDate: Date;
  authorId: string;
  action: string;
}

export interface PageVersionWithAuthor extends PageVersion {
  author: Pick<User, "id" | "name" | "avatar">;
}

// ─── Tag ──────────────────────────────────────────────────────────────────────

export interface Tag {
  id: string;
  name: string;
}

export interface PageTag {
  pageId: string;
  tagId: string;
}

// ─── Asset ────────────────────────────────────────────────────────────────────

export interface AssetFolder {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

export interface Asset {
  id: string;
  filename: string;
  ext: string;
  fileSize: number;
  mimeType: string;
  folderId: string | null;
  authorId: string;
  createdAt: Date;
}

export interface AssetWithUrl extends Asset {
  url: string;
}

// ─── Comment ──────────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  pageId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentWithAuthor extends Comment {
  author: Pick<User, "id" | "name" | "avatar">;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export interface NavigationItem {
  id: string;
  type: NavigationItemType;
  label: string;
  icon: string | null;
  path: string | null;
  pageId: string | null;
  parentId: string | null;
  order: number;
  locale: string;
}

export interface NavigationTree extends NavigationItem {
  children: NavigationTree[];
}

// ─── API Key ──────────────────────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  name: string;
  keyHash: string;
  userId: string;
  permissions: PermissionMap;
  expiration: Date | null;
  createdAt: Date;
  isActive: boolean;
}

// ─── Page Rule ────────────────────────────────────────────────────────────────

export interface PageRule {
  id: string;
  match: PageRuleMatch;
  pattern: string;
  permissions: PermissionMap;
  groupId: string | null;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface SearchResult {
  pageId: string;
  path: string;
  title: string;
  description: string | null;
  locale: string;
  score: number;
  highlights: SearchHighlight[];
}

export interface SearchHighlight {
  field: string;
  snippet: string;
}

export interface SearchOptions {
  locale?: string;
  limit?: number;
  offset?: number;
  tags?: string[];
  author?: string;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export interface StorageFile {
  filename: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
}

export type StorageProviderType = "local" | "s3" | "gcs" | "azure";

export interface StorageConfig {
  provider: StorageProviderType;
  local?: { rootPath: string; baseUrl: string };
  s3?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
    baseUrl?: string;
  };
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationInput {
  page?: number;
  perPage?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
