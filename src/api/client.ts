import type { ConnectConfig, HealthResponse, MetaResponse, SnapshotResponse, TodoItem, TodoList } from '../types/api.ts';
import { DEFAULT_REQUEST_TIMEOUT_MS } from '../config/app.ts';

interface ListCollectionResponse {
  items: TodoList[];
  defaultListId: string | null;
  time: number;
}

interface TodoCollectionResponse {
  items: TodoItem[];
  lists: TodoList[];
  defaultListId: string | null;
  time: number;
}

interface ClearCompletedResponse {
  deleted: number;
}

export class ApiClient {
  private baseUrl: string = '';
  private token: string | null = null;

  setBaseUrl(url: string) {
    this.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.baseUrl) throw new Error('Base URL not set');

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS);
    const headers = new Headers(options.headers || {});
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }
    if (options.body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers,
        signal: controller.signal
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('AUTH_ERROR');
        }
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || error.message || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('请求超时，请检查节点网络连接');
      }
      throw error;
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  // Auth-free endpoints
  async checkHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/api/health');
  }

  async getConnectConfig(): Promise<ConnectConfig> {
    return this.request<ConnectConfig>('/api/connect-config');
  }

  // Auth-required endpoints
  async getMeta(): Promise<MetaResponse> {
    return this.request<MetaResponse>('/api/meta');
  }

  async getSnapshot(): Promise<SnapshotResponse> {
    return this.request<SnapshotResponse>('/api/snapshot');
  }

  async getLists(): Promise<TodoList[]> {
    const response = await this.request<ListCollectionResponse>('/api/lists');
    return Array.isArray(response.items) ? response.items : [];
  }

  async createList(title: string, id?: string): Promise<TodoList> {
    return this.request<TodoList>('/api/lists', {
      method: 'POST',
      body: JSON.stringify({
        title,
        id
      })
    });
  }

  async updateList(id: string, title: string): Promise<TodoList> {
    return this.request<TodoList>(`/api/lists/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title })
    });
  }

  async deleteList(id: string): Promise<void> {
    return this.request<void>(`/api/lists/${id}`, {
      method: 'DELETE'
    });
  }

  async getTodos(): Promise<TodoItem[]> {
    const response = await this.request<TodoCollectionResponse>('/api/todos');
    return Array.isArray(response.items) ? response.items : [];
  }

  async createTodo(todo: Partial<TodoItem>): Promise<TodoItem> {
    const payload: Record<string, unknown> = {
      id: todo.id,
      title: todo.title,
      listId: todo.listId,
      tag: typeof todo.tag === 'string' ? todo.tag : undefined
    };
    if (Object.prototype.hasOwnProperty.call(todo, 'dueAt')) {
      payload.dueAt = todo.dueAt ?? null;
    }

    return this.request<TodoItem>('/api/todos', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateTodo(id: string, updates: Partial<TodoItem>): Promise<TodoItem> {
    const payload: Partial<TodoItem> = {};
    if (typeof updates.title === 'string') {
      payload.title = updates.title;
    }
    if (typeof updates.completed === 'boolean') {
      payload.completed = updates.completed;
    }
    if (typeof updates.listId === 'string') {
      payload.listId = updates.listId;
    }
    if (typeof updates.tag === 'string') {
      payload.tag = updates.tag;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'dueAt')) {
      payload.dueAt = updates.dueAt ?? null;
    }

    return this.request<TodoItem>(`/api/todos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async deleteTodo(id: string): Promise<void> {
    return this.request<void>(`/api/todos/${id}`, {
      method: 'DELETE'
    });
  }

  async clearCompleted(listId?: string): Promise<ClearCompletedResponse> {
    return this.request<ClearCompletedResponse>('/api/todos/clear-completed', {
      method: 'POST',
      body: JSON.stringify(listId ? { listId } : {})
    });
  }
}

export const apiClient = new ApiClient();
