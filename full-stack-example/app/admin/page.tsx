import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import AdminDashboard from './AdminDashboard';

export default async function AdminPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (!session.is_admin) {
    redirect('/');
  }

  return (
    <main className="min-h-screen">
      <Navbar user={session} />

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Admin Dashboard
          </h1>
          <p className="text-white/70">
            Manage courses and view registered students
          </p>
        </div>

        <AdminDashboard />
      </div>
    </main>
  );
}
