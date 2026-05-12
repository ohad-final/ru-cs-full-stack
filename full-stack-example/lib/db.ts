import Database from 'better-sqlite3';
import path from 'path';
import type { User, Course, Registration, CourseWithCount } from './types';

// Create database in the project directory
const dbPath = path.join(process.cwd(), 'data.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    max_students INTEGER NOT NULL DEFAULT 30,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    registered_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    UNIQUE(user_id, course_id)
  );
`);

// ============ USER OPERATIONS ============

export function createUser(username: string, passwordHash: string, isAdmin = false): User {
  const stmt = db.prepare(`
    INSERT INTO users (username, password_hash, is_admin)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(username, passwordHash, isAdmin ? 1 : 0);
  return getUserById(result.lastInsertRowid as number)!;
}

export function getUserByUsername(username: string): User | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  return stmt.get(username) as User | undefined;
}

export function getUserById(id: number): User | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id) as User | undefined;
}

export function getAllStudents(): User[] {
  const stmt = db.prepare('SELECT * FROM users WHERE is_admin = 0 ORDER BY username');
  return stmt.all() as User[];
}

// ============ COURSE OPERATIONS ============

export function createCourse(name: string, description: string, maxStudents: number): Course {
  const stmt = db.prepare(`
    INSERT INTO courses (name, description, max_students)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(name, description, maxStudents);
  return getCourseById(result.lastInsertRowid as number)!;
}

export function getCourseById(id: number): Course | undefined {
  const stmt = db.prepare('SELECT * FROM courses WHERE id = ?');
  return stmt.get(id) as Course | undefined;
}

export function getAllCourses(): Course[] {
  const stmt = db.prepare('SELECT * FROM courses ORDER BY name');
  return stmt.all() as Course[];
}

export function getCoursesWithEnrollment(): CourseWithCount[] {
  const stmt = db.prepare(`
    SELECT
      c.*,
      COUNT(r.id) as enrolled_count
    FROM courses c
    LEFT JOIN registrations r ON c.id = r.course_id
    GROUP BY c.id
    ORDER BY c.name
  `);
  return stmt.all() as CourseWithCount[];
}

// ============ REGISTRATION OPERATIONS ============

/**
 * Register a student for a course.
 * Uses a transaction to ensure atomic check-and-insert.
 * Returns { success: true } or { success: false, error: string }
 */
export function registerForCourse(userId: number, courseId: number): { success: boolean; error?: string } {
  const checkAndRegister = db.transaction(() => {
    // Check if already registered
    const existing = db.prepare(
      'SELECT id FROM registrations WHERE user_id = ? AND course_id = ?'
    ).get(userId, courseId);

    if (existing) {
      return { success: false, error: 'Already registered for this course' };
    }

    // Get course and current enrollment count
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId) as Course | undefined;
    if (!course) {
      return { success: false, error: 'Course not found' };
    }

    const enrolledCount = db.prepare(
      'SELECT COUNT(*) as count FROM registrations WHERE course_id = ?'
    ).get(courseId) as { count: number };

    // Check if course is full
    if (enrolledCount.count >= course.max_students) {
      return { success: false, error: 'Course is full' };
    }

    // Register the student
    db.prepare(
      'INSERT INTO registrations (user_id, course_id) VALUES (?, ?)'
    ).run(userId, courseId);

    return { success: true };
  });

  return checkAndRegister();
}

export function unregisterFromCourse(userId: number, courseId: number): boolean {
  const stmt = db.prepare('DELETE FROM registrations WHERE user_id = ? AND course_id = ?');
  const result = stmt.run(userId, courseId);
  return result.changes > 0;
}

export function getUserRegistrations(userId: number): Course[] {
  const stmt = db.prepare(`
    SELECT c.* FROM courses c
    INNER JOIN registrations r ON c.id = r.course_id
    WHERE r.user_id = ?
    ORDER BY c.name
  `);
  return stmt.all(userId) as Course[];
}

export function getCourseStudents(courseId: number): User[] {
  const stmt = db.prepare(`
    SELECT u.id, u.username, u.is_admin, u.created_at FROM users u
    INNER JOIN registrations r ON u.id = r.user_id
    WHERE r.course_id = ?
    ORDER BY u.username
  `);
  return stmt.all(courseId) as User[];
}

export default db;
