// lib/storage.ts
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { UTApi } from 'uploadthing/server';

export interface UploadFileInput {
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
  folder?: string;
}

export interface UploadFileResult {
  storageKey: string;
  storedFilename: string;
  size: number;
}

export interface StorageProvider {
  uploadPdf(input: UploadFileInput): Promise<UploadFileResult>;
  getLocalFilePath?(storageKey: string): string;
  readFile(storageKey: string): Promise<Buffer>;
  deleteFile?(storageKey: string): Promise<void>;
  createSignedUrl(storageKey: string, expiresInSeconds?: number): string;
}

const LOCAL_ROOT = path.join(process.cwd(), 'storage', 'uploads');

function getSigningSecret(): string {
  return (
    process.env.STORAGE_SIGNING_SECRET ||
    process.env.JWT_SECRET ||
    'dev-storage-signing-secret-change-me'
  );
}

export function signStoragePayload(payload: {
  key: string;
  exp: number;
  userId?: string;
}): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyStorageSignature(token: string): {
  key: string;
  exp: number;
  userId?: string;
} | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encoded, providedSig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encoded)
    .digest('base64url');

  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as { key?: string; exp?: number; userId?: string };

    if (!parsed.key || typeof parsed.exp !== 'number') return null;
    if (Date.now() > parsed.exp) return null;

    return { key: parsed.key, exp: parsed.exp, userId: parsed.userId };
  } catch {
    return null;
  }
}

export class LocalStorageProvider implements StorageProvider {
  getLocalFilePath(storageKey: string): string {
    const normalized = path.normalize(storageKey).replace(/^(\.\.[/\\])+/, '');
    const fullPath = path.resolve(LOCAL_ROOT, normalized);
    if (!fullPath.startsWith(path.resolve(LOCAL_ROOT))) {
      throw new Error('Invalid storage key path.');
    }
    return fullPath;
  }

  async uploadPdf(input: UploadFileInput): Promise<UploadFileResult> {
    const safeBaseName = path
      .basename(input.originalFilename)
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedFilename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeBaseName}`;
    const subfolder = input.folder
      ? input.folder.replace(/[^a-zA-Z0-9/_-]/g, '')
      : '';
    const storageKey = subfolder ? `${subfolder}/${storedFilename}` : storedFilename;

    const fullPath = this.getLocalFilePath(storageKey);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, input.buffer);

    return {
      storageKey,
      storedFilename,
      size: input.buffer.byteLength,
    };
  }

  async readFile(storageKey: string): Promise<Buffer> {
    const fullPath = this.getLocalFilePath(storageKey);
    return readFile(fullPath);
  }

createSignedUrl(storageKey: string, expiresInSeconds = 60 * 60 * 24): string {
  const exp = Date.now() + expiresInSeconds * 1000;
  const token = signStoragePayload({ key: storageKey, exp });
  return `/api/documents/file?token=${encodeURIComponent(token)}`;
}
}

export class UploadThingStorageProvider implements StorageProvider {
  private utapi: UTApi | null = null;

  private getClient(): UTApi {
    if (!this.utapi) {
      this.utapi = new UTApi();
    }
    return this.utapi;
  }

  async uploadPdf(input: UploadFileInput): Promise<UploadFileResult> {
    const safeBaseName = path
      .basename(input.originalFilename)
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedFilename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeBaseName}`;

    const file = new File([new Uint8Array(input.buffer)], storedFilename, {
      type: input.mimeType || 'application/pdf',
    });

    const response = await this.getClient().uploadFiles([file]);
    const uploaded = Array.isArray(response) ? response[0] : response;

    if (!uploaded || uploaded.error || !uploaded.data?.key) {
      throw new Error(
        uploaded?.error?.message || 'UploadThing failed to upload PDF.'
      );
    }

    return {
      storageKey: uploaded.data.key,
      storedFilename,
      size: input.buffer.byteLength,
    };
  }

  async readFile(storageKey: string): Promise<Buffer> {
    const { ufsUrl } = await this.getClient().generateSignedURL(storageKey);
    const res = await fetch(ufsUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch file from UploadThing (${res.status}).`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async deleteFile(storageKey: string): Promise<void> {
    await this.getClient().deleteFiles(storageKey);
  }

  createSignedUrl(storageKey: string, expiresInSeconds = 300): string {
    const exp = Date.now() + expiresInSeconds * 1000;
    const token = signStoragePayload({ key: storageKey, exp });
    return `/api/documents/file?token=${encodeURIComponent(token)}`;
  }
}

let cachedProvider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!cachedProvider) {
    const driver = (process.env.STORAGE_DRIVER || 'local').toLowerCase();
    if (driver === 'uploadthing') {
      cachedProvider = new UploadThingStorageProvider();
    } else {
      cachedProvider = new LocalStorageProvider();
    }
  }
  return cachedProvider;
}