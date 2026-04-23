import { SignJWT, jwtVerify } from "jose";

export const AUTH_COOKIE_NAME = "neurox_auth";

const secretValue = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET || "dev-only-change-me";
const secretKey = new TextEncoder().encode(secretValue);

const TOKEN_ISSUER = "neurox";
const TOKEN_AUDIENCE = "neurox-app";
const TOKEN_EXPIRY = "7d";

export async function signAuthToken({ userId, email, name, role }) {
  return new SignJWT({
    userId: Number(userId),
    email,
    name,
    role: String(role || "").toLowerCase(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secretKey);
}

export async function verifyAuthToken(token) {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    });
    return payload;
  } catch {
    return null;
  }
}

export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}
