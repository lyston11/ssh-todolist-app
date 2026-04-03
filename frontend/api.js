const JSON_HEADERS = {
  "Content-Type": "application/json",
};

export const API_BASE = "/api/todos";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function fetchMeta(serverBaseUrl, authToken = "") {
  return request(serverBaseUrl, "/api/meta", authToken);
}

export async function fetchSnapshot(serverBaseUrl, authToken = "") {
  return request(serverBaseUrl, "/api/snapshot", authToken);
}

export async function fetchLists(serverBaseUrl, authToken = "") {
  const response = await request(serverBaseUrl, "/api/lists", authToken);
  return Array.isArray(response.items) ? response.items : [];
}

export async function fetchTodos(serverBaseUrl, authToken = "") {
  const response = await request(serverBaseUrl, API_BASE, authToken);
  return Array.isArray(response.items) ? response.items : [];
}

export async function createList(serverBaseUrl, authToken, title, id = undefined) {
  return request(serverBaseUrl, "/api/lists", authToken, {
    method: "POST",
    body: JSON.stringify({ title, id }),
  });
}

export async function updateList(serverBaseUrl, authToken, listId, payload) {
  return request(serverBaseUrl, `/api/lists/${listId}`, authToken, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteList(serverBaseUrl, authToken, listId) {
  return request(serverBaseUrl, `/api/lists/${listId}`, authToken, { method: "DELETE" });
}

export async function createTodo(serverBaseUrl, authToken, title, listId, id = undefined) {
  return request(serverBaseUrl, API_BASE, authToken, {
    method: "POST",
    body: JSON.stringify({ id, title, listId }),
  });
}

export async function updateTodo(serverBaseUrl, authToken, todoId, payload) {
  return request(serverBaseUrl, `${API_BASE}/${todoId}`, authToken, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteTodo(serverBaseUrl, authToken, todoId) {
  return request(serverBaseUrl, `${API_BASE}/${todoId}`, authToken, { method: "DELETE" });
}

export async function clearCompletedTodos(serverBaseUrl, authToken, listId) {
  return request(serverBaseUrl, `${API_BASE}/clear-completed`, authToken, {
    method: "POST",
    body: JSON.stringify({ listId }),
  });
}

async function request(serverBaseUrl, path, authToken = "", options = {}) {
  const response = await fetch(buildUrl(serverBaseUrl, path), {
    headers: {
      ...JSON_HEADERS,
      ...buildAuthHeaders(authToken),
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload.error === "string" ? payload.error : `request failed: ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return payload;
}

function buildAuthHeaders(authToken) {
  const normalizedToken = authToken.trim();
  if (!normalizedToken) {
    return {};
  }

  return {
    Authorization: `Bearer ${normalizedToken}`,
  };
}

function buildUrl(serverBaseUrl, path) {
  const base = serverBaseUrl.trim();
  if (!base) {
    throw new Error("请先配置同步节点地址");
  }

  return new URL(path, `${base}/`).toString();
}
