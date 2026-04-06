import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageFile } from "@court-wiki/core";
import type { StorageProvider, UploadInput } from "./index.js";

interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  baseUrl?: string;
}

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private baseUrl: string | undefined;

  constructor(config: S3Config) {
    this.bucket = config.bucket;
    this.baseUrl = config.baseUrl;

    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      ...(config.endpoint && {
        endpoint: config.endpoint,
        forcePathStyle: true,
      }),
    });
  }

  async upload(file: UploadInput, filePath: string): Promise<StorageFile> {
    const key = filePath.replace(/^\//, "");

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimeType,
        ContentLength: file.size,
      })
    );

    return {
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size,
      path: filePath,
      url: await this.getUrl(filePath),
    };
  }

  async download(filePath: string): Promise<Buffer> {
    const key = filePath.replace(/^\//, "");

    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key })
    );

    if (!response.Body) throw new Error(`No body for S3 key: ${key}`);

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async delete(filePath: string): Promise<void> {
    const key = filePath.replace(/^\//, "");
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
    );
  }

  async list(folder: string): Promise<StorageFile[]> {
    const prefix = folder.replace(/^\//, "").replace(/\/?$/, "/");

    const response = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        Delimiter: "/",
      })
    );

    const files: StorageFile[] = [];

    for (const obj of response.Contents ?? []) {
      if (!obj.Key || obj.Key === prefix) continue;
      const filename = obj.Key.slice(prefix.length);
      const ext = filename.split(".").pop() ?? "";
      files.push({
        filename,
        mimeType: "application/octet-stream",
        size: obj.Size ?? 0,
        path: `/${obj.Key}`,
        url: await this.getUrl(`/${obj.Key}`),
      });
    }

    return files;
  }

  async getUrl(filePath: string, expiresInSeconds = 3600): Promise<string> {
    const key = filePath.replace(/^\//, "");

    if (this.baseUrl) {
      return `${this.baseUrl.replace(/\/$/, "")}/${key}`;
    }

    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}
