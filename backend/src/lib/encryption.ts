import crypto from "node:crypto";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits standard for GCM
const PREFIX = "enc:v1:";

/**
 * Derives a 32-byte encryption key buffer from environment configuration.
 */
function getEncryptionKey(): Buffer | null {
  const rawKey = env.DATABASE_ENCRYPTION_KEY;
  if (!rawKey) {
    return null;
  }

  // If 64-char hex string (32 bytes)
  if (rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
    return Buffer.from(rawKey, "hex");
  }

  // Fallback: SHA-256 hash to guarantee exactly 32 bytes
  return crypto.createHash("sha256").update(rawKey).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Format: enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  if (!key) {
    if (env.NODE_ENV === "production") {
      throw new Error("DATABASE_ENCRYPTION_KEY is required for encryption in production.");
    }
    // In dev without key, return as-is
    return plaintext;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encryptedBuffer = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag().toString("hex");
  const ivHex = iv.toString("hex");
  const encryptedHex = encryptedBuffer.toString("hex");

  return `${PREFIX}${ivHex}:${authTag}:${encryptedHex}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * Gracefully handles legacy unencrypted strings if not prefixed.
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext.startsWith(PREFIX)) {
    // Unencrypted legacy value
    return ciphertext;
  }

  const key = getEncryptionKey();
  if (!key) {
    if (env.NODE_ENV === "production") {
      throw new Error("DATABASE_ENCRYPTION_KEY is required for decryption in production.");
    }
    return ciphertext;
  }

  try {
    const payload = ciphertext.slice(PREFIX.length);
    const parts = payload.split(":");
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      throw new Error("Invalid ciphertext structure.");
    }

    const ivHex = parts[0];
    const authTagHex = parts[1];
    const encryptedHex = parts[2];

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encryptedBuffer = Buffer.from(encryptedHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decryptedBuffer = Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final(),
    ]);

    return decryptedBuffer.toString("utf8");
  } catch (error) {
    logger.error({ error }, "Failed to decrypt database field.");
    throw new Error("Decryption failed. Data may be corrupted or encryption key mismatch.");
  }
}
