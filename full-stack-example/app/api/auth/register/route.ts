import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, createUser } from '@/lib/db';
import { hashPassword, createSession, setSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  // Validate input
  if (!username || !password) {
    return NextResponse.json(
      { error: 'Username and password required' },
      { status: 400 }
    );
  }

  if (password.length < 4) {
    return NextResponse.json(
      { error: 'Password must be at least 4 characters' },
      { status: 400 }
    );
  }

  // Check if username exists
  const existing = getUserByUsername(username);
  if (existing) {
    return NextResponse.json(
      { error: 'Username already taken' },
      { status: 409 }
    );
  }

  // Create user
  const passwordHash = await hashPassword(password);
  const user = createUser(username, passwordHash, false);

  // Create session
  const token = await createSession({
    id: user.id,
    username: user.username,
    is_admin: false
  });

  // Set cookie and return user info
  const response = NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      is_admin: false
    }
  });

  response.cookies.set(setSessionCookie(token));
  return response;
}
