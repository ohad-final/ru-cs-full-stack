import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername } from '@/lib/db';
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  // Validate input
  if (!username || !password) {
    return NextResponse.json(
      { error: 'Username and password required' },
      { status: 400 }
    );
  }

  // Find user
  const user = getUserByUsername(username);
  if (!user) {
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }

  // Verify password
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }

  // Create session
  const token = await createSession({
    id: user.id,
    username: user.username,
    is_admin: Boolean(user.is_admin)
  });

  // Set cookie and return user info
  const response = NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      is_admin: Boolean(user.is_admin)
    }
  });

  response.cookies.set(setSessionCookie(token));
  return response;
}
