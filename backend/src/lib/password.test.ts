import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("Password Argon2 Hashing Unit Tests", () => {
  it("should hash a plaintext password with salt and verify successfully", async () => {
    const password = "P@ssw0rdSecure2026!";
    const hash = await hashPassword(password);

    expect(typeof hash).toBe("string");
    expect(hash).toContain("$argon2");

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it("should return false when verifying an incorrect password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    const isValid = await verifyPassword("wrong-password", hash);

    expect(isValid).toBe(false);
  });
});
