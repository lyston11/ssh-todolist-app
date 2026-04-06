import assert from 'node:assert/strict';
import test from 'node:test';
import type { PendingAction } from '../src/types/api.ts';
import { flushPendingActions } from '../src/state/useSyncQueue.ts';

function createAction(id: string): PendingAction {
  return {
    id,
    type: 'delete',
    entityId: `todo-${id}`,
    timestamp: Number(id),
  };
}

test('flushPendingActions clears the queue after successful execution', async () => {
  const queue = [createAction('1'), createAction('2')];
  const executed: string[] = [];

  const remaining = await flushPendingActions(queue, async (action) => {
    executed.push(action.id);
  });

  assert.deepEqual(executed, ['1', '2']);
  assert.deepEqual(remaining, []);
});

test('flushPendingActions keeps failed actions but continues on recoverable errors', async () => {
  const queue = [createAction('1'), createAction('2'), createAction('3')];
  const executed: string[] = [];

  const remaining = await flushPendingActions(queue, async (action) => {
    executed.push(action.id);
    if (action.id === '2') {
      throw new Error('NETWORK_ERROR');
    }
  });

  assert.deepEqual(executed, ['1', '2', '3']);
  assert.deepEqual(remaining, [queue[1]]);
});

test('flushPendingActions stops after auth failure and preserves the rest of the queue', async () => {
  const queue = [createAction('1'), createAction('2'), createAction('3')];
  const executed: string[] = [];

  const remaining = await flushPendingActions(queue, async (action) => {
    executed.push(action.id);
    if (action.id === '2') {
      throw new Error('AUTH_ERROR');
    }
  });

  assert.deepEqual(executed, ['1', '2']);
  assert.deepEqual(remaining, [queue[1], queue[2]]);
});
