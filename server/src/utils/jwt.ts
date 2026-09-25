import {
  jwtVerify,
  SignJWT,
} from "jose";

import { env } from "../config/env.js";

const secret = new TextEncoder().encode(
  env.JWT_ACCESS_SECRET,
);

export interface AccessTokenPayload {
  sub: string;
  type: "access";
}

export async function createAccessToken(
  userId: string,
): Promise<string> {
  return new SignJWT({
    type: "access",
  })
    .setProtectedHeader({
      alg: "HS256",
      typ: "JWT",
    })
    .setSubject(userId)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_EXPIRES_IN)
    .sign(secret);
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify<{
    type?: string;
  }>(
    token,
    secret,
    {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      algorithms: ["HS256"],
    },
  );

  if (
    typeof payload.sub !== "string" ||
    payload.type !== "access"
  ) {
    throw new Error("Token inválido.");
  }

  return {
    sub: payload.sub,
    type: "access",
  };
}