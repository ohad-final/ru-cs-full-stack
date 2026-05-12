'use client';

import { useEffect, useState } from 'react';
import type { CourseWithCount, User, Course } from '@/lib/types';

interface StudentWithCourses extends User {
  courses: Course[];
}

export default function AdminDashboard() {
  const [courses, setCourses] = useState<CourseWithCount[]>([]);
  const [students, setStudents] = useState<StudentWithCourses[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'courses' | 'students'>('courses');

  const [newCourse, setNewCourse] = useState({
    name: '',
    description: '',
    maxStudents: 3
  });
  const [addingCourse, setAddingCourse] = useState(false);

  async function fetchData() {
    const [coursesRes, studentsRes] = await Promise.all([
      fetch('/api/admin/courses'),
      fetch('/api/admin/students')
    ]);
    const coursesData = await coursesRes.json();
    const studentsData = await studentsRes.json();
    setCourses(coursesData.courses);
    setStudents(studentsData.students);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleAddCourse(e: React.FormEvent) {
    e.preventDefault();
    setAddingCourse(true);

    await fetch('/api/admin/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCourse)
    });

    setNewCourse({ name: '', description: '', maxStudents: 3 });
    setAddingCourse(false);
    fetchData();
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin text-4xl">⚙️</div>
        <p className="text-white/70 mt-4">Loading admin data...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setActiveTab('courses')}
          className={`px-6 py-3 rounded-lg font-medium transition ${
            activeTab === 'courses'
              ? 'bg-purple-500 text-white'
              : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
        >
          📚 Courses ({courses.length})
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`px-6 py-3 rounded-lg font-medium transition ${
            activeTab === 'students'
              ? 'bg-purple-500 text-white'
              : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
        >
          👥 Students ({students.length})
        </button>
      </div>

      {activeTab === 'courses' && (
        <div>
          <form
            onSubmit={handleAddCourse}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 mb-8"
          >
            <h3 className="text-xl font-bold text-white mb-4">Add New Course</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Course name"
                value={newCourse.name}
                onChange={e => setNewCourse({ ...newCourse, name: e.target.value })}
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30"
                required
              />
              <input
                type="text"
                placeholder="Description"
                value={newCourse.description}
                onChange={e => setNewCourse({ ...newCourse, description: e.target.value })}
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Max students"
                  value={newCourse.maxStudents}
                  onChange={e => setNewCourse({ ...newCourse, maxStudents: parseInt(e.target.value) })}
                  min={1}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                  required
                />
                <button
                  type="submit"
                  disabled={addingCourse}
                  className="px-6 py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg transition"
                >
                  Add
                </button>
              </div>
            </div>
          </form>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-white/70 font-medium">Course</th>
                  <th className="text-left p-4 text-white/70 font-medium">Description</th>
                  <th className="text-center p-4 text-white/70 font-medium">Enrolled</th>
                  <th className="text-center p-4 text-white/70 font-medium">Max</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(course => (
                  <tr key={course.id} className="border-b border-white/5 last:border-0">
                    <td className="p-4 text-white font-medium">{course.name}</td>
                    <td className="p-4 text-white/70">{course.description}</td>
                    <td className="p-4 text-center">
                      <span className={`
                        px-2 py-1 rounded
                        ${course.enrolled_count >= course.max_students
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-green-500/20 text-green-300'}
                      `}>
                        {course.enrolled_count}
                      </span>
                    </td>
                    <td className="p-4 text-center text-white/70">{course.max_students}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-white/70 font-medium">Username</th>
                <th className="text-left p-4 text-white/70 font-medium">Registered Courses</th>
                <th className="text-center p-4 text-white/70 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student.id} className="border-b border-white/5 last:border-0">
                  <td className="p-4 text-white font-medium">{student.username}</td>
                  <td className="p-4">
                    {student.courses.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {student.courses.map(course => (
                          <span
                            key={course.id}
                            className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-sm"
                          >
                            {course.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-white/50">No courses</span>
                    )}
                  </td>
                  <td className="p-4 text-center text-white/50 text-sm">
                    {new Date(student.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
