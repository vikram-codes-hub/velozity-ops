// frontend/src/types/domain.ts
//
// Single source of truth for shared domain shapes across the frontend.

export type Role = 'ADMIN' | 'PM' | 'DEVELOPER';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'OVERDUE';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  clientName?: string;
  client?: { id: string; name: string };
  createdById: string;
  createdAt: string;
  _count?: { tasks: number };
  taskCounts?: Record<TaskStatus, number>;
  overdueCount?: number;
  memberCount?: number;
}

export interface DeveloperStat {
  id: string;
  name: string;
  email: string;
  role: Role;
  projectCount: number;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  assignedToId: string | null;
  assignedToName?: string;
  assignedTo?: { id: string; name: string } | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string; // ISO
  createdAt: string;
  updatedAt: string;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: Priority;
  dueFrom?: string; // ISO datetime
  dueTo?: string;   // ISO datetime
}

// Matches the WS ActivityEventPayload / GET /api/activity shape
export interface ActivityEvent {
  id: string;
  taskId: string;
  taskTitle?: string;
  projectId: string;
  projectName?: string;
  userId?: string | null;
  userName?: string;
  actorName?: string;
  assignedToId?: string | null;
  action: string;
  fromValue: string | null;
  toValue: string | null;
  createdAt: string;
  message?: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  taskId: string | null;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface CursorPage<T> {
  data: T[];
  nextCursor: string | null;
}
