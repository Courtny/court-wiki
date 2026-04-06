import type { StorageConfig, StorageFile } from "@court-wiki/core";

// ─── StorageProvider Interface ────────────────────────────────────────────────

export interface UploadInput {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  size: number;
}

export interface StorageProvider {
  /**
   * Upload a file to the given path. Returns a StorageFile descriptor.
   */
  upload(file: UploadInput, path: string): Promise<StorageFile>;

  /**
   * Download a file from the given path. Returns a Buffer.
   */
  download(path: string): Promise<Buffer>;

  /**
   * Delete a file at the given path.
   */
  delete(path: string): Promise<void>;

  /**
   * List all files in a folder prefix.
   */
  list(folder: string): Promise<StorageFile[]>;

  /**
   * Get a publicly-accessible (or pre-signed) URL for the given path.
   */
  getUrl(path: string, expiresInSeconds?: number): Promise<string>;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export async function createStorageProvider(
  config: StorageConfig
): Promise<StorageProvider> {
  switch (config.provider) {
    case "local": {
      const { LocalStorageProvider } = await import("./local.js");
      if (!config.local) {
        throw new Error(
          "Local storage config missing: provide { rootPath, baseUrl }"
        );
      }
      return new LocalStorageProvider(config.local.rootPath, config.local.baseUrl);
    }
    case "s3": {
      const { S3StorageProvider } = await import("./s3.js");
      if (!config.s3) {
        throw new Error("S3 storage config missing");
      }
      return new S3StorageProvider(config.s3);
    }
    default:
      throw new Error(`Unknown storage provider: ${config.provider as string}`);
  }
}

export type { StorageConfig, StorageFile };
