// Database types - these mirror our SQLite schema

export interface User {
  id: number;
  username: string;
  password_hash: string;
  is_admin: boolean;
  created_at: string;
}

export interface Course {
  id: number;
  name: string;
  description: string;
  max_students: number;
  created_at: string;
}

export interface Registration {
  id: number;
  user_id: number;
  course_id: number;
  registered_at: string;
}

// API response types
export interface CourseWithCount extends Course {
  enrolled_count: number;
}

export interface UserSession {
  id: number;
  username: string;
  is_admin: boolean;
}
