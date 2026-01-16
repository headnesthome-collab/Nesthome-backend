import crypto from "crypto";
import { z } from "zod";

// Simple password hashing using Node's built-in crypto (no external dependencies)
// For production, consider using bcrypt or argon2
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(":");
  if (!salt || !hash) return false;

  const verifyHash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");

  return hash === verifyHash;
}

// Get admin password from environment or use default (for initial setup)
export function getAdminPasswordHash(): string {
  const envPassword = process.env.ADMIN_PASSWORD;
  const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || "admin123";
  
  // If ADMIN_PASSWORD is set, it's already hashed
  if (envPassword && envPassword.includes(":")) {
    return envPassword;
  }
  
  // If ADMIN_PASSWORD is set but not hashed, hash it
  if (envPassword) {
    return hashPassword(envPassword);
  }
  
  // Use default password (hashed)
  // In production, this should be set via environment variable
  return hashPassword(defaultPassword);
}

// Store admin password hash (in production, use database)
let adminPasswordHash: string | null = null;

export function initializeAdminPassword(): void {
  adminPasswordHash = getAdminPasswordHash();
  console.log("✅ Admin password initialized");
}

export function getStoredAdminPasswordHash(): string {
  if (!adminPasswordHash) {
    adminPasswordHash = getAdminPasswordHash();
  }
  return adminPasswordHash;
}

export function updateAdminPassword(newPassword: string): void {
  adminPasswordHash = hashPassword(newPassword);
  // In production, save to database
  console.log("✅ Admin password updated");
}

// Session management
const sessions = new Map<string, { userId: string; expiresAt: number }>();
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function createSession(userId: string): string {
  const sessionId = crypto.randomBytes(32).toString("hex");
  sessions.set(sessionId, {
    userId,
    expiresAt: Date.now() + SESSION_DURATION,
  });
  
  // Clean up expired sessions
  cleanupExpiredSessions();
  
  return sessionId;
}

export function validateSession(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return false;
  }
  
  return true;
}

export function destroySession(sessionId: string): void {
  sessions.delete(sessionId);
}

function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(sessionId);
    }
  }
}

// Validation schemas
export const loginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});
