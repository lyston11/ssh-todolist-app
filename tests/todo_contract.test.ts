import assert from 'node:assert/strict';
import test from 'node:test';
import { apiClient } from '../src/api/client.ts';
import { LOCAL_DEFAULT_LIST_ID } from '../src/lib/nodes.ts';
import { buildInitialTodoState, buildSnapshotState, resolveActiveListId } from '../src/state/todoModels.ts';
import type { SnapshotResponse } from '../src/types/api.ts';

function jsonResponse(payload: unknown, status: number = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

test('buildInitialTodoState creates a stable local default list when local cache is empty', () => {
  const state = buildInitialTodoState(null, { localMode: true });

  assert.equal(state.lists.length, 1);
  assert.equal(state.lists[0]?.id, LOCAL_DEFAULT_LIST_ID);
  assert.equal(state.activeListId, LOCAL_DEFAULT_LIST_ID);
  assert.deepEqual(state.items, []);
});

test('resolveActiveListId falls back to the service default list when current selection is stale', () => {
  const lists = [
    { id: 'list-a', title: '工作' },
    { id: 'list-b', title: '私人' },
  ];

  assert.equal(resolveActiveListId(lists, 'missing-list', 'list-b'), 'list-b');
});

test('buildSnapshotState accepts the services snapshot contract and normalizes UI sync flags', () => {
  const snapshot: SnapshotResponse = {
    type: 'todos.snapshot',
    lists: [
      { id: 'list-a', title: '工作' },
      { id: 'list-b', title: '私人' },
    ],
    items: [
      {
        id: 'todo-1',
        listId: 'list-b',
        title: '同步任务',
        completed: false,
        tag: '重要',
        dueAt: null,
      },
    ],
    defaultListId: 'list-b',
    time: 1712800000000,
  };

  const state = buildSnapshotState(snapshot, 'missing-list');

  assert.equal(state.activeListId, 'list-b');
  assert.equal(state.items[0]?.isSynced, true);
  assert.equal(state.items[0]?.isPending, false);
  assert.equal(state.items[0]?.tag, '重要');
});

test('apiClient.getSnapshot uses the services /api/snapshot contract with bearer auth', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
    apiClient.setBaseUrl('');
    apiClient.setToken(null);
  });

  const snapshot: SnapshotResponse = {
    lists: [{ id: 'default-list', title: '默认清单' }],
    items: [{ id: 'todo-1', listId: 'default-list', title: '来自服务端', completed: false }],
    defaultListId: 'default-list',
    time: 1712800000000,
  };

  globalThis.fetch = (async (input, init) => {
    assert.equal(String(input), 'http://100.64.0.8:8000/api/snapshot');
    assert.equal(init?.method, undefined);
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer secret-token');
    return jsonResponse(snapshot);
  }) as typeof fetch;

  apiClient.setBaseUrl('http://100.64.0.8:8000');
  apiClient.setToken('secret-token');

  const received = await apiClient.getSnapshot();
  assert.deepEqual(received, snapshot);
});

test('apiClient.clearCompleted posts the exact services endpoint and empty payload', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
    apiClient.setBaseUrl('');
    apiClient.setToken(null);
  });

  globalThis.fetch = (async (input, init) => {
    assert.equal(String(input), 'http://100.64.0.8:8000/api/todos/clear-completed');
    assert.equal(init?.method, 'POST');
    assert.equal(init?.body, '{}');
    return jsonResponse({ deleted: 3 });
  }) as typeof fetch;

  apiClient.setBaseUrl('http://100.64.0.8:8000');
  await apiClient.clearCompleted();
});

test('apiClient.clearCompleted sends listId when requesting a scoped clear', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
    apiClient.setBaseUrl('');
    apiClient.setToken(null);
  });

  globalThis.fetch = (async (_input, init) => {
    assert.equal(init?.body, JSON.stringify({ listId: 'list-b' }));
    return jsonResponse({ deleted: 1 });
  }) as typeof fetch;

  apiClient.setBaseUrl('http://100.64.0.8:8000');
  await apiClient.clearCompleted('list-b');
});
