import path from "node:path";
import fs from "node:fs";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/app-error.js";
import { env } from "../../config/env.js";
import { GENERAL_UPLOAD_CONFIG } from "../../config/constants.js";

const ALLOWED_MIME_TYPES = new Set<string>(GENERAL_UPLOAD_CONFIG.ALLOWED_MIME_TYPES);

const MAX_FILE_SIZE = GENERAL_UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES;

const uploadDir = path.resolve(env.UPLOAD_DIR, "temp");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Sanitizes a filename to safe alphanumeric characters only.
 * Strips path separators, null bytes, and non-ASCII characters.
 */
function sanitizeStoredFilename(originalName: string, prefix: string): string {
  const ext = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, "");
  const allowedExtensions = new Set<string>(GENERAL_UPLOAD_CONFIG.ALLOWED_EXTENSIONS);
  const safeExt = allowedExtensions.has(ext) ? ext : "";
  return `${prefix}${safeExt}`;
}

/**
 * Express middleware that validates uploaded files using binary magic bytes.
 * Must be used AFTER multer memoryStorage to access the buffer before writing to disk.
 */
export async function validateAndSaveUpload(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const reqWithFiles = req as Request & {
    file?: Express.Multer.File;
    files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
  };

  let files: Express.Multer.File[] = [];
  if (reqWithFiles.file) {
    files = [reqWithFiles.file];
  } else if (Array.isArray(reqWithFiles.files)) {
    files = reqWithFiles.files;
  } else if (reqWithFiles.files && typeof reqWithFiles.files === "object") {
    files = Object.values(reqWithFiles.files).flat();
  }

  for (const file of files) {
    if (!file.buffer || file.buffer.length === 0) {
      return next(new AppError("Uploaded file is empty or unreadable.", 400));
    }

    // Check magic bytes — never trust the client-supplied MIME type
    const detected = await fileTypeFromBuffer(file.buffer);
    const detectedMime = detected?.mime ?? null;

    if (!detectedMime || !ALLOWED_MIME_TYPES.has(detectedMime)) {
      return next(
        new AppError(
          `File type rejected. Detected: '${detectedMime ?? "unknown"}'. Only PDF, Word documents, and images (JPEG/PNG/WebP) are allowed.`,
          400,
        ),
      );
    }

    // Override the client-supplied mimetype with the verified one
    file.mimetype = detectedMime;

    // Write the validated buffer to disk with a safe, randomized filename
    const prefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeFilename = sanitizeStoredFilename(file.originalname, prefix);
    const destPath = path.join(uploadDir, safeFilename);

    await fs.promises.writeFile(destPath, file.buffer);

    // Populate path/filename on the file object so downstream handlers work unchanged
    file.path = destPath;
    file.filename = safeFilename;
    file.destination = uploadDir;
  }

  next();
}

// Multer using memoryStorage — buffer must be present for magic byte inspection before any disk write
const memoryStorage = multer.memoryStorage();

export const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: GENERAL_UPLOAD_CONFIG.MAX_FILES,
  },
});
