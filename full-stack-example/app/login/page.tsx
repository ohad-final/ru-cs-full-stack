'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <span className="text-4xl">🤖</span>
            <span className="text-2xl font-bold text-white">AI University</span>
          </Link>
          <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
          <p className="text-white/70 mt-2">Sign in to continue your AI journey</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/10">
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-white/70 text-sm mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-purple-400"
              placeholder="Enter username"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-white/70 text-sm mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-purple-400"
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-medium rounded-lg transition"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-center text-white/50 mt-6">
            Don't have an account?{' '}
            <Link href="/register" className="text-purple-400 hover:underline">
              Register
            </Link>
          </p>
        </form>

        <div className="mt-6 p-4 bg-white/5 rounded-lg">
          <p className="text-white/50 text-sm text-center mb-2">Test accounts:</p>
          <p className="text-white/70 text-sm text-center">
            <span className="text-purple-300">admin/admin</span> (admin) |{' '}
            <span className="text-purple-300">alice/alice</span>,{' '}
            <span className="text-purple-300">bob/bob</span> (students)
          </p>
        </div>
      </div>
    </main>
  );
}
