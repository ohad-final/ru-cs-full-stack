'use client';

import { useEffect, useState } from 'react';
import CourseCard from '@/components/CourseCard';
import type { CourseWithCount } from '@/lib/types';

interface CoursesPageProps {
  isLoggedIn: boolean;
  isAdmin: boolean;
}

export default function CoursesPage({ isLoggedIn, isAdmin }: CoursesPageProps) {
  const [courses, setCourses] = useState<CourseWithCount[]>([]);
  const [userCourseIds, setUserCourseIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchCourses() {
    const res = await fetch('/api/courses');
    const data = await res.json();
    setCourses(data.courses);
    setUserCourseIds(data.userCourseIds || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchCourses();
  }, []);

  async function handleRegister(courseId: number) {
    setError(null);
    const res = await fetch('/api/courses/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId })
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      return;
    }

    await fetchCourses();
  }

  async function handleUnregister(courseId: number) {
    setError(null);
    const res = await fetch('/api/courses/register', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId })
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      return;
    }

    await fetchCourses();
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin text-4xl">🤖</div>
        <p className="text-white/70 mt-4">Loading courses...</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-center">
          {error}
        </div>
      )}

      {!isLoggedIn && (
        <div className="mb-6 p-4 bg-purple-500/20 border border-purple-500/50 rounded-lg text-purple-300 text-center">
          Please <a href="/login" className="underline">login</a> or{' '}
          <a href="/register" className="underline">register</a> to enroll in courses
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses.map(course => (
          <CourseCard
            key={course.id}
            course={course}
            isRegistered={userCourseIds.includes(course.id)}
            isLoggedIn={isLoggedIn}
            isAdmin={isAdmin}
            onRegister={handleRegister}
            onUnregister={handleUnregister}
          />
        ))}
      </div>
    </div>
  );
}
