import crypto from 'node:crypto';

/**
 * Generates a cryptographically secure random token (64 hex characters, 32 bytes).
 * @returns The random token.
 */
export function generateRandomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hashes a token using SHA-256 to securely store it in the database.
 * @param token The raw token to hash.
 * @returns The hex-encoded SHA-256 hash of the token.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
