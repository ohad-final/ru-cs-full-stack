import { NextRequest, NextResponse } from 'next/server';
import { registerForCourse, unregisterFromCourse } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (session.is_admin) {
    return NextResponse.json({ error: 'Admins cannot register for courses' }, { status: 403 });
  }

  const { courseId } = await request.json();

  if (!courseId) {
    return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
  }

  const result = registerForCourse(session.id, courseId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { courseId } = await request.json();

  if (!courseId) {
    return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
  }

  const success = unregisterFromCourse(session.id, courseId);

  if (!success) {
    return NextResponse.json({ error: 'Not registered for this course' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
