import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { logger } from "./logger.js";
import { env } from "../config/env.js";

const UPLOAD_ROOT = path.resolve(env.UPLOAD_DIR);

/**
 * Validates that a storage key does not escape the upload root directory.
 * Prevents path traversal attacks.
 */
function resolveAndValidate(storageKey: string): string {
  const sanitized = storageKey.replace(/\.\./g, "").replace(/^\/+/, "");
  const fullPath = path.resolve(UPLOAD_ROOT, sanitized);

  if (!fullPath.startsWith(UPLOAD_ROOT)) {
    throw new Error("Invalid storage key: path traversal detected.");
  }

  return fullPath;
}

/**
 * Persists a file buffer to the local filesystem.
 * Creates intermediate directories automatically.
 */
export async function saveFile(
  buffer: Buffer,
  storageKey: string,
): Promise<string> {
  const filePath = resolveAndValidate(storageKey);
  const dir = path.dirname(filePath);

  await fsp.mkdir(dir, { recursive: true });
  await fsp.writeFile(filePath, buffer);

  logger.debug({ storageKey, size: buffer.length }, "File saved to disk");
  return storageKey;
}

/**
 * Returns a readable stream for a stored file.
 * Throws if the file does not exist.
 */
export function getFileStream(storageKey: string): fs.ReadStream {
  const filePath = resolveAndValidate(storageKey);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${storageKey}`);
  }

  return fs.createReadStream(filePath);
}

/**
 * Checks whether a file exists on disk.
 */
export async function fileExists(storageKey: string): Promise<boolean> {
  const filePath = resolveAndValidate(storageKey);
  try {
    await fsp.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Deletes a file from disk. No-op if the file does not exist.
 */
export async function deleteFile(storageKey: string): Promise<void> {
  const filePath = resolveAndValidate(storageKey);
  try {
    await fsp.unlink(filePath);
    logger.debug({ storageKey }, "File deleted from disk");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }
}

/**
 * Returns the absolute filesystem path for a storage key.
 * Used by Express to stream files to the client.
 */
export function getAbsolutePath(storageKey: string): string {
  return resolveAndValidate(storageKey);
}
