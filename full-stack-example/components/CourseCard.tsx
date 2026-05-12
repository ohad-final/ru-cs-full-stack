'use client';

import { useState } from 'react';
import type { CourseWithCount } from '@/lib/types';

interface CourseCardProps {
  course: CourseWithCount;
  isRegistered: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  onRegister: (courseId: number) => Promise<void>;
  onUnregister: (courseId: number) => Promise<void>;
}

export default function CourseCard({
  course,
  isRegistered,
  isLoggedIn,
  isAdmin,
  onRegister,
  onUnregister
}: CourseCardProps) {
  const [loading, setLoading] = useState(false);
  const isFull = course.enrolled_count >= course.max_students;
  const spotsLeft = course.max_students - course.enrolled_count;

  async function handleClick() {
    setLoading(true);
    try {
      if (isRegistered) {
        await onUnregister(course.id);
      } else {
        await onRegister(course.id);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`
      bg-white/10 backdrop-blur-sm rounded-2xl p-6 border transition-all duration-300
      ${isRegistered
        ? 'border-green-400/50 shadow-lg shadow-green-500/20'
        : isFull
          ? 'border-red-400/30'
          : 'border-white/10 hover:border-purple-400/50'}
    `}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-white">{course.name}</h3>
        {isRegistered && (
          <span className="px-3 py-1 bg-green-500/20 text-green-300 text-sm rounded-full">
            Enrolled
          </span>
        )}
      </div>

      <p className="text-white/70 mb-4">{course.description}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`
            px-3 py-1 rounded-full text-sm font-medium
            ${isFull
              ? 'bg-red-500/20 text-red-300'
              : spotsLeft <= 1
                ? 'bg-yellow-500/20 text-yellow-300'
                : 'bg-purple-500/20 text-purple-300'}
          `}>
            {isFull ? 'FULL' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
          </div>
          <span className="text-white/50 text-sm">
            {course.enrolled_count}/{course.max_students} enrolled
          </span>
        </div>

        {isLoggedIn && !isAdmin && (
          <button
            onClick={handleClick}
            disabled={loading || (isFull && !isRegistered)}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50
              ${isRegistered
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300'
                : 'bg-purple-500 hover:bg-purple-600 text-white'}
            `}
          >
            {loading ? '...' : isRegistered ? 'Drop' : 'Register'}
          </button>
        )}
      </div>
    </div>
  );
}
