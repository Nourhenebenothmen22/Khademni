import path from "node:path";
import fs from "node:fs";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/app-error.js";
import { env } from "../../config/env.js";
import { AVATAR_UPLOAD_CONFIG } from "../../config/constants.js";

const ALLOWED_IMAGE_MIME_TYPES = new Set<string>(AVATAR_UPLOAD_CONFIG.ALLOWED_MIME_TYPES);

const MAX_IMAGE_FILE_SIZE = AVATAR_UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES;

const uploadDir = path.resolve(env.UPLOAD_DIR, "temp");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Sanitizes a filename to safe alphanumeric characters and allowed image extensions only.
 */
function sanitizeImageFilename(originalName: string, prefix: string): string {
  const ext = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, "");
  const allowedExtensions = new Set<string>(AVATAR_UPLOAD_CONFIG.ALLOWED_EXTENSIONS);
  const safeExt = allowedExtensions.has(ext) ? ext : "";
  return `${prefix}${safeExt}`;
}

/**
 * Express middleware that validates avatar image uploads using binary magic bytes.
 * Must be applied after multer memoryStorage.
 */
export async function validateAndSaveAvatarUpload(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file) return next();

  if (!file.buffer || file.buffer.length === 0) {
    return next(new AppError("Uploaded image is empty or unreadable.", 400));
  }

  // Check magic bytes — never trust the client-supplied MIME type
  const detected = await fileTypeFromBuffer(file.buffer);
  const detectedMime = detected?.mime ?? null;

  if (!detectedMime || !ALLOWED_IMAGE_MIME_TYPES.has(detectedMime)) {
    return next(
      new AppError(
        `Image type rejected. Detected: '${detectedMime ?? "unknown"}'. Only JPEG, PNG, and WebP images are allowed.`,
        400,
      ),
    );
  }

  // Override with verified mime
  file.mimetype = detectedMime;

  // Write validated buffer to disk with a safe, randomized filename
  const prefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const safeFilename = sanitizeImageFilename(file.originalname, prefix);
  const destPath = path.join(uploadDir, safeFilename);

  await fs.promises.writeFile(destPath, file.buffer);

  file.path = destPath;
  file.filename = safeFilename;
  file.destination = uploadDir;

  next();
}

// Multer using memoryStorage so the buffer is available for magic byte inspection
const memoryStorage = multer.memoryStorage();

export const avatarUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_IMAGE_FILE_SIZE,
    files: 1,
  },
});
