import { getSession } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import CoursesPage from './CoursesPage';

export default async function Home() {
  const session = await getSession();

  return (
    <main className="min-h-screen">
      <Navbar user={session} />

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Welcome to <span className="text-purple-400">AI University</span>
          </h1>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Register for the most cutting-edge courses in artificial intelligence.
            Limited seats available - secure your spot before the robots do!
          </p>
        </div>

        <CoursesPage
          isLoggedIn={!!session}
          isAdmin={session?.is_admin ?? false}
        />
      </div>
    </main>
  );
}
