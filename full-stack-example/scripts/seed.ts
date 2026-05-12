import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

// Create tables if they don't exist
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

// Clear existing data
db.exec('DELETE FROM registrations');
db.exec('DELETE FROM courses');
db.exec('DELETE FROM users');

console.log('🗑️  Cleared existing data');

// Create users (password = username for simplicity)
const users = [
  { username: 'admin', password: 'admin', isAdmin: true },
  { username: 'alice', password: 'alice', isAdmin: false },
  { username: 'bob', password: 'bob', isAdmin: false },
  { username: 'charlie', password: 'charlie', isAdmin: false },
  { username: 'dana', password: 'dana', isAdmin: false },
];

const insertUser = db.prepare(`
  INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)
`);

for (const user of users) {
  const hash = bcrypt.hashSync(user.password, 10);
  insertUser.run(user.username, hash, user.isAdmin ? 1 : 0);
  console.log(`👤 Created user: ${user.username} (${user.isAdmin ? 'admin' : 'student'})`);
}

// Create courses with funny AI-era names
const courses = [
  {
    name: 'Prompt Engineering 101',
    description: 'Learn to talk to robots without them taking over the world',
    maxStudents: 2
  },
  {
    name: 'Debugging Neural Networks',
    description: 'Why did the AI cross the road? We still don\'t know.',
    maxStudents: 3
  },
  {
    name: 'Ethics of Autonomous Toasters',
    description: 'When your appliances start making decisions, who is responsible?',
    maxStudents: 2
  },
  {
    name: 'Machine Learning for Cat Photos',
    description: 'The only reason ML was invented. Prove me wrong.',
    maxStudents: 3
  },
  {
    name: 'Surviving the Robot Apocalypse',
    description: 'Practical tips for when Skynet becomes self-aware',
    maxStudents: 2
  }
];

const insertCourse = db.prepare(`
  INSERT INTO courses (name, description, max_students) VALUES (?, ?, ?)
`);

for (const course of courses) {
  insertCourse.run(course.name, course.description, course.maxStudents);
  console.log(`📚 Created course: ${course.name} (max ${course.maxStudents} students)`);
}

console.log('\n✅ Database seeded successfully!');
console.log('\n📋 Test accounts:');
console.log('   Admin: admin / admin');
console.log('   Students: alice/alice, bob/bob, charlie/charlie, dana/dana');

db.close();
