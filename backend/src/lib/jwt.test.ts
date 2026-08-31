import { describe, it, expect } from "vitest";
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  signMfaPendingToken,
  verifyMfaPendingToken,
} from "./jwt.js";

describe("JWT Crypto Service Unit Tests", () => {
  const mockPayload = {
    userId: "usr_abc123",
    role: "ORGANIZATION_ADMIN",
    organizationId: "org_xyz789",
  };

  describe("Access Token", () => {
    it("should sign and verify valid access token", async () => {
      const token = await signAccessToken(mockPayload);
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);

      const verified = await verifyAccessToken(token);
      expect(verified.userId).toBe(mockPayload.userId);
      expect(verified.role).toBe(mockPayload.role);
      expect(verified.organizationId).toBe(mockPayload.organizationId);
      expect(verified.isMfaPending).toBe(false);
    });

    it("should reject tampered access token signature", async () => {
      const token = await signAccessToken(mockPayload);
      const parts = token.split(".");
      const sig = parts[2] || "";
      const tamperedSignature = sig.substring(0, Math.max(0, sig.length - 4)) + "XXXX";
      const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSignature}`;

      await expect(verifyAccessToken(tamperedToken)).rejects.toThrow();
    });
  });

  describe("Refresh Token", () => {
    it("should sign and verify valid refresh token with separate secret", async () => {
      const token = await signRefreshToken(mockPayload);
      const verified = await verifyRefreshToken(token);

      expect(verified.userId).toBe(mockPayload.userId);
      expect(verified.role).toBe(mockPayload.role);

      // Access secret verification should fail on refresh token
      await expect(verifyAccessToken(token)).rejects.toThrow();
    });
  });

  describe("MFA Pending Token", () => {
    it("should sign and verify MFA pending token with isMfaPending=true", async () => {
      const token = await signMfaPendingToken(mockPayload);
      const verified = await verifyMfaPendingToken(token);

      expect(verified.userId).toBe(mockPayload.userId);
      expect(verified.isMfaPending).toBe(true);
    });

    it("should reject standard access token in verifyMfaPendingToken", async () => {
      const token = await signAccessToken(mockPayload);
      await expect(verifyMfaPendingToken(token)).rejects.toThrow("Invalid MFA pending token");
    });
  });
});
