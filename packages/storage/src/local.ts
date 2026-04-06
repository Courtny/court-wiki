import fs from "fs/promises";
import path from "path";
import type { StorageFile } from "@court-wiki/core";
import type { StorageProvider, UploadInput } from './index';

export class LocalStorageProvider implements StorageProvider {
  private rootPath: string;
  private baseUrl: string;

  constructor(rootPath: string, baseUrl: string) {
    this.rootPath = rootPath;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private resolvePath(filePath: string): string {
    // Prevent path traversal
    const resolved = path.resolve(this.rootPath, filePath.replace(/^\//, ""));
    if (!resolved.startsWith(path.resolve(this.rootPath))) {
      throw new Error("Path traversal detected");
    }
    return resolved;
  }

  async upload(file: UploadInput, filePath: string): Promise<StorageFile> {
    const fullPath = this.resolvePath(filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, file.buffer);

    return {
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size,
      path: filePath,
      url: await this.getUrl(filePath),
    };
  }

  async download(filePath: string): Promise<Buffer> {
    const fullPath = this.resolvePath(filePath);
    return fs.readFile(fullPath);
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = this.resolvePath(filePath);
    try {
      await fs.unlink(fullPath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }

  async list(folder: string): Promise<StorageFile[]> {
    const fullPath = this.resolvePath(folder);
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const files: StorageFile[] = [];

      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = path.join(folder, entry.name);
          const stat = await fs.stat(this.resolvePath(filePath));
          const ext = path.extname(entry.name).slice(1);
          files.push({
            filename: entry.name,
            mimeType: getMimeType(ext),
            size: stat.size,
            path: filePath,
            url: await this.getUrl(filePath),
          });
        }
      }

      return files;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
  }

  async getUrl(filePath: string, _expiresInSeconds?: number): Promise<string> {
    const normalizedPath = filePath.replace(/\\/g, "/").replace(/^\//, "");
    return `${this.baseUrl}/${normalizedPath}`;
  }
}

function getMimeType(ext: string): string {
  const mimeMap: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    pdf: "application/pdf",
    txt: "text/plain",
    md: "text/markdown",
    json: "application/json",
    zip: "application/zip",
    mp4: "video/mp4",
    mp3: "audio/mpeg",
  };
  return mimeMap[ext.toLowerCase()] ?? "application/octet-stream";
}
