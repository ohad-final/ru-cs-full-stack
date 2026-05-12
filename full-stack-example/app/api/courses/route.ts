import { NextResponse } from 'next/server';
import { getCoursesWithEnrollment, getUserRegistrations } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  const courses = getCoursesWithEnrollment();

  // If logged in, also get user's registrations
  let userCourseIds: number[] = [];
  if (session) {
    const userCourses = getUserRegistrations(session.id);
    userCourseIds = userCourses.map(c => c.id);
  }

  return NextResponse.json({
    courses,
    userCourseIds
  });
}
