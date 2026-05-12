import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import type { UserSession } from './types';

const JWT_SECRET = new TextEncoder().encode('super-secret-key-for-demo-only');
const COOKIE_NAME = 'session';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: UserSession): Promise<string> {
  const token = await new SignJWT({
    id: user.id,
    username: user.username,
    is_admin: user.is_admin
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  return token;
}

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as number,
      username: payload.username as string,
      is_admin: payload.is_admin as boolean
    };
  } catch {
    return null;
  }
}

export function setSessionCookie(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 // 24 hours
  };
}

export function clearSessionCookie() {
  return {
    name: COOKIE_NAME,
    value: '',
    maxAge: 0
  };
}
