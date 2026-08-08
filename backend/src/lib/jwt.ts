import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";
import { env } from "../config/env.js";

const ACCESS_SECRET = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const REFRESH_SECRET = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

export interface TokenPayload {
  userId: string;
  role: string;
  organizationId?: string;
  isMfaPending?: boolean;
}

export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    role: payload.role,
    organizationId: payload.organizationId,
    jti: nanoid(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(ACCESS_SECRET);
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, ACCESS_SECRET);
  return {
    userId: payload.userId as string,
    role: payload.role as string,
    organizationId: payload.organizationId as string | undefined,
    isMfaPending: payload.isMfaPending === true,
  };
}

export async function signMfaPendingToken(payload: {
  userId: string;
  role: string;
  organizationId?: string;
}): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    role: payload.role,
    organizationId: payload.organizationId,
    isMfaPending: true,
    jti: nanoid(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(ACCESS_SECRET);
}

export async function verifyMfaPendingToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, ACCESS_SECRET);
  if (payload.isMfaPending !== true) {
    throw new Error("Invalid MFA pending token");
  }
  return {
    userId: payload.userId as string,
    role: payload.role as string,
    organizationId: payload.organizationId as string | undefined,
    isMfaPending: true,
  };
}

export async function signRefreshToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    role: payload.role,
    organizationId: payload.organizationId,
    jti: nanoid(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(REFRESH_SECRET);
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, REFRESH_SECRET);
  return {
    userId: payload.userId as string,
    role: payload.role as string,
    organizationId: payload.organizationId as string | undefined,
  };
}
