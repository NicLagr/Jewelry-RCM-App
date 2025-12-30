import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "jewelry-crm-secret-key";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

// Get user from Authorization header (Bearer token)
export function getUserFromRequest(request: Request): AuthUser | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix
  return verifyToken(token);
}

// Get current user - returns null since we don't use cookies anymore
// This is kept for layout compatibility but won't return a user
export async function getCurrentUser(): Promise<AuthUser | null> {
  // With sessionStorage-based auth, we can't get the user server-side
  // The client handles auth state via SessionGuard
  return null;
}

// Verify request has valid auth and return user, or null if not authenticated
export async function getAuthenticatedUser(request: Request): Promise<AuthUser | null> {
  const user = getUserFromRequest(request);
  if (!user) return null;

  // Verify user still exists and is active
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, role: true, active: true },
  });

  if (!dbUser || !dbUser.active) return null;

  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
  };
}

export function canManageUsers(role: string): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "MANAGER";
}

export function canManageSettings(role: string): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function canEditJobs(role: string): boolean {
  return ["OWNER", "ADMIN", "MANAGER", "JEWELER"].includes(role);
}

