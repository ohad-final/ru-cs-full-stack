'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { UserSession } from '@/lib/types';

interface NavbarProps {
  user: UserSession | null;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="bg-white/10 backdrop-blur-md border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-3xl">🤖</span>
          <span className="text-xl font-bold text-white">AI University</span>
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              {user.is_admin && (
                <Link
                  href="/admin"
                  className="text-purple-300 hover:text-white transition"
                >
                  Admin Panel
                </Link>
              )}
              <span className="text-white/70">
                Welcome, <span className="text-purple-300 font-medium">{user.username}</span>
                {user.is_admin && <span className="ml-1 text-xs bg-purple-500 px-2 py-0.5 rounded">ADMIN</span>}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-white/70 hover:text-white transition"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
