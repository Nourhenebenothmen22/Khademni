import argon2 from "argon2";

/**
 * Hashes a plaintext password using Argon2.
 * @param password The plaintext password to hash.
 * @returns A promise that resolves to the hashed password.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

/**
 * Verifies a plaintext password against an Argon2 hash.
 * @param password The plaintext password to verify.
 * @param hash The Argon2 hash to compare against.
 * @returns A promise that resolves to a boolean indicating match status.
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return argon2.verify(hash, password);
}
