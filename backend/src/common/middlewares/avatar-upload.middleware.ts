import path from "node:path";
import fs from "node:fs";
import multer from "multer";
import type { Request } from "express";
import { AppError } from "../errors/app-error.js";
import { env } from "../../config/env.js";

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_IMAGE_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

const tempDir = path.resolve(env.UPLOAD_DIR, "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, tempDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}_${file.originalname}`);
  },
});

const imageFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void => {
  if (ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Invalid image type '${file.mimetype}'. Only JPEG, PNG, and WebP images are allowed.`,
        400,
      ),
    );
  }
};

export const avatarUpload = multer({
  storage,
  limits: {
    fileSize: MAX_IMAGE_FILE_SIZE,
    files: 1,
  },
  fileFilter: imageFileFilter,
});
