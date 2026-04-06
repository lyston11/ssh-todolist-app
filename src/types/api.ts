export interface ConnectCandidate {
  kind: string;
  source: string;
  host: string;
  serverUrl: string;
  wsUrl: string;
}

export interface ConnectConfig {
  serverUrl: string;
  token: string;
  authRequired: boolean;
  wsUrl: string;
  wsPort: number;
  wsPath: string;
  candidates?: ConnectCandidate[];
  connectConfigPath?: string;
  connectLinkPath?: string;
  time?: number;
}

export interface Candidate {
  id: string;
  name: string;
  ip: string;
  serverUrl: string;
  wsUrl: string;
  kind: string;
  source: string;
  status: 'connectable' | 'needs-token' | 'unreachable' | 'detecting';
  latency?: string;
}

export interface MetaResponse {
  wsPort: number | null;
  wsPath: string;
  time: number;
  authRequired: boolean;
  connectConfigPath: string;
  connectLinkPath: string;
  serverUrl: string;
  wsUrl: string;
  candidates: ConnectCandidate[];
}

export interface HealthResponse {
  status: 'ok';
  time: number;
  wsPort: number;
  authRequired: boolean;
}

export interface TodoList {
  id: string;
  title: string;
  isDefault?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface TodoItem {
  id: string;
  listId: string;
  title: string;
  completed: boolean;
  createdAt?: number;
  updatedAt?: number;
  completedAt?: number | null;
  dueAt?: number | null;
  time?: string;
  tag?: string;
  isSynced?: boolean; // Local UI state
  isPending?: boolean; // Pending sync state
}

export type ActionType =
  | 'create'
  | 'update'
  | 'delete'
  | 'clear-completed'
  | 'create-list'
  | 'update-list'
  | 'delete-list';

export type PendingActionData =
  | Partial<TodoItem>
  | TodoList
  | { title: string }
  | undefined;

export interface PendingAction {
  id: string;
  type: ActionType;
  entityId?: string;
  data?: PendingActionData;
  timestamp: number;
}

export interface LocalCache {
  lists: TodoList[];
  items: TodoItem[];
  defaultListId: string | null;
  lastSnapshotTime: number;
}

export interface SnapshotResponse {
  type?: 'todos.snapshot';
  lists: TodoList[];
  items: TodoItem[];
  defaultListId: string | null;
  time: number;
}

export type ConnectionStatus = 'online' | 'offline' | 'reconnecting' | 'token-error' | 'node-unreachable';
