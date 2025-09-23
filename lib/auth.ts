import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

export interface JWTPayload {
  userId: string;
  email: string;
  businessId: string;
  role: string;
  roleId?: string | null;
  sessionId?: string;
  permissions?: string[];
  iat?: number;
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(
      token,
      process.env.NEXTAUTH_SECRET!
    ) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

export function getUserFromRequest(request: NextRequest): JWTPayload | null {
  const token = getTokenFromRequest(request);
  if (!token) {
    return null;
  }
  return verifyToken(token);
}

// Client-side auth utilities
export function setAuthToken(token: string) {
  localStorage.setItem("token", token);
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function removeAuthToken() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function setUserData(user: any) {
  localStorage.setItem("user", JSON.stringify(user));
}

export function getUserData() {
  if (typeof window === "undefined") return null;
  const userData = localStorage.getItem("user");
  return userData ? JSON.parse(userData) : null;
}
