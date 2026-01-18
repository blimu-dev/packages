// Generated types from OpenAPI components.schemas

export type Enum<T> = T[keyof T];

export interface CreateUserRequest {
  age?: number;
  email: string;
  name?: string;
}

export interface DataItem {
  id: string;
  timestamp: string;
  value: number;
}

export interface PatchUserRequest {
  email?: string;
  name?: string;
}

export interface UpdateUserRequest {
  age?: number;
  email?: string;
  name?: string;
}

export interface User {
  age?: number | null;
  email: string;
  id: string;
  metadata?: Record<string, unknown>;
  name?: string | null;
  status: 'active' | 'inactive' | 'pending';
}

// Operation query parameter interfaces

/**
 * Query params for users.ListUsers*/
export interface UsersListUsersQuery {
  limit?: number;
  offset?: number;
  status?: ('active' | 'inactive' | 'pending')[];
}
