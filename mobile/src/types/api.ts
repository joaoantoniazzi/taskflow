export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Team {
  id: string;
  name: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  memberCount: number;
  projectCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  dueDate: string | null;
  taskCount: number;
  team: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
export type ColumnType = "TODO" | "DOING" | "DONE";

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  dueDate: string | null;
  position: number;
  completedAt: string | null;
  assignee: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
}

export interface BoardColumn {
  id: string;
  name: string;
  type: ColumnType;
  position: number;
  wipLimit: number | null;
  tasks: Task[];
}

export interface Board {
  id: string;
  name: string;
  projectId: string;
  columns: BoardColumn[];
}
