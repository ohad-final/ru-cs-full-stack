import { NextResponse } from 'next/server';
import { getAllStudents, getUserRegistrations } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();

  if (!session?.is_admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const students = getAllStudents();

  // Get each student's course registrations
  const studentsWithCourses = students.map(student => ({
    ...student,
    courses: getUserRegistrations(student.id)
  }));

  return NextResponse.json({ students: studentsWithCourses });
}
