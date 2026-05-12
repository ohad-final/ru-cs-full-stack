import { NextRequest, NextResponse } from 'next/server';
import { createCourse, getCoursesWithEnrollment } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();

  if (!session?.is_admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const courses = getCoursesWithEnrollment();
  return NextResponse.json({ courses });
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session?.is_admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { name, description, maxStudents } = await request.json();

  if (!name || !maxStudents) {
    return NextResponse.json(
      { error: 'Name and max students required' },
      { status: 400 }
    );
  }

  const course = createCourse(name, description || '', maxStudents);
  return NextResponse.json({ course });
}
