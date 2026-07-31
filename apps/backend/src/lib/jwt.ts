import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";
import { env } from "../config/env.js";

const ACCESS_SECRET = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const REFRESH_SECRET = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

export interface TokenPayload {
  userId: string;
  role: string;
}

export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    role: payload.role,
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
  };
}

export async function signRefreshToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    role: payload.role,
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
  };
}
