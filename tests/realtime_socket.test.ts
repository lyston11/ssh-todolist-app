import assert from 'node:assert/strict';
import test from 'node:test';
import { RealtimeSocket } from '../src/realtime/socket.ts';
import type { SnapshotResponse } from '../src/types/api.ts';

type TimerRecord = {
  callback: () => void;
  delay: number;
};

class FakeEventTarget {
  private listeners = new Map<string, Set<() => void>>();

  addEventListener(type: string, listener: () => void) {
    const bucket = this.listeners.get(type) || new Set<() => void>();
    bucket.add(listener);
    this.listeners.set(type, bucket);
  }

  removeEventListener(type: string, listener: () => void) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string) {
    for (const listener of this.listeners.get(type) || []) {
      listener();
    }
  }
}

class FakeDocument extends FakeEventTarget {
  visibilityState: 'hidden' | 'visible' = 'hidden';
}

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readonly url: string;
  readyState = FakeWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  emitJson(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }

  triggerClose() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }
}

function installGlobal(name: 'window' | 'document' | 'WebSocket' | 'setTimeout' | 'clearTimeout', value: unknown) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value,
  });
}

function createTimerHarness() {
  let nextId = 1;
  const timers = new Map<number, TimerRecord>();

  return {
    setTimeout: ((callback: () => void, delay?: number) => {
      const id = nextId++;
      timers.set(id, { callback, delay: Number(delay || 0) });
      return id as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout,
    clearTimeout: ((timerId: ReturnType<typeof setTimeout>) => {
      timers.delete(Number(timerId));
    }) as typeof clearTimeout,
    getDelays() {
      return [...timers.values()].map((timer) => timer.delay);
    },
    runNext() {
      const next = timers.entries().next().value as [number, TimerRecord] | undefined;
      if (!next) {
        throw new Error('No timer scheduled');
      }
      const [timerId, timer] = next;
      timers.delete(timerId);
      timer.callback();
      return timer.delay;
    },
  };
}

function createSnapshot(time: number): SnapshotResponse {
  return {
    type: 'todos.snapshot',
    lists: [{ id: 'default-list', title: '默认清单' }],
    items: [{ id: 'todo-1', listId: 'default-list', title: '任务', completed: false }],
    defaultListId: 'default-list',
    time,
  };
}

test('RealtimeSocket forwards snapshot payloads and includes the token in the websocket url', (t) => {
  const originalWebSocket = globalThis.WebSocket;
  installGlobal('WebSocket', FakeWebSocket);
  t.after(() => {
    FakeWebSocket.instances = [];
    installGlobal('WebSocket', originalWebSocket);
  });

  const socket = new RealtimeSocket();
  const statuses: string[] = [];
  const snapshots: SnapshotResponse[] = [];

  socket.onStatus((status) => statuses.push(status));
  socket.onMessage((snapshot) => snapshots.push(snapshot));

  socket.connect('ws://100.64.0.8:8001/ws', 'secret token');

  assert.equal(FakeWebSocket.instances[0]?.url, 'ws://100.64.0.8:8001/ws?token=secret%20token');

  FakeWebSocket.instances[0]?.open();
  FakeWebSocket.instances[0]?.emitJson(createSnapshot(1));
  FakeWebSocket.instances[0]?.emitJson({ type: 'ignored.message' });

  assert.deepEqual(statuses, ['connected']);
  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0]?.type, 'todos.snapshot');
});

test('RealtimeSocket uses exponential reconnect backoff until a socket opens again', (t) => {
  const originalWebSocket = globalThis.WebSocket;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const timers = createTimerHarness();

  installGlobal('WebSocket', FakeWebSocket);
  installGlobal('setTimeout', timers.setTimeout);
  installGlobal('clearTimeout', timers.clearTimeout);

  t.after(() => {
    FakeWebSocket.instances = [];
    installGlobal('WebSocket', originalWebSocket);
    installGlobal('setTimeout', originalSetTimeout);
    installGlobal('clearTimeout', originalClearTimeout);
  });

  const socket = new RealtimeSocket();
  const statuses: string[] = [];
  socket.onStatus((status) => statuses.push(status));

  socket.connect('ws://100.64.0.8:8001/ws');
  FakeWebSocket.instances[0]?.triggerClose();

  assert.deepEqual(timers.getDelays(), [1000]);
  assert.deepEqual(statuses, ['reconnecting']);

  timers.runNext();
  assert.equal(FakeWebSocket.instances.length, 2);

  FakeWebSocket.instances[1]?.triggerClose();
  assert.deepEqual(timers.getDelays(), [2000]);

  timers.runNext();
  assert.equal(FakeWebSocket.instances.length, 3);

  FakeWebSocket.instances[2]?.open();
  assert.deepEqual(statuses, ['reconnecting', 'reconnecting', 'connected']);
});

test('RealtimeSocket reacts to online and visibilitychange by scheduling immediate reconnects', (t) => {
  const originalWebSocket = globalThis.WebSocket;
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const timers = createTimerHarness();
  const fakeWindow = new FakeEventTarget();
  const fakeDocument = new FakeDocument();

  installGlobal('WebSocket', FakeWebSocket);
  installGlobal('window', fakeWindow);
  installGlobal('document', fakeDocument);
  installGlobal('setTimeout', timers.setTimeout);
  installGlobal('clearTimeout', timers.clearTimeout);

  t.after(() => {
    FakeWebSocket.instances = [];
    installGlobal('WebSocket', originalWebSocket);
    installGlobal('window', originalWindow);
    installGlobal('document', originalDocument);
    installGlobal('setTimeout', originalSetTimeout);
    installGlobal('clearTimeout', originalClearTimeout);
  });

  const socket = new RealtimeSocket();
  socket.connect('ws://100.64.0.8:8001/ws');
  FakeWebSocket.instances[0]?.open();

  FakeWebSocket.instances[0]!.readyState = FakeWebSocket.CLOSED;
  fakeWindow.dispatch('online');
  assert.deepEqual(timers.getDelays(), [0]);

  timers.runNext();
  assert.equal(FakeWebSocket.instances.length, 2);

  FakeWebSocket.instances[1]!.readyState = FakeWebSocket.CLOSED;
  fakeDocument.visibilityState = 'visible';
  fakeDocument.dispatch('visibilitychange');
  assert.deepEqual(timers.getDelays(), [0]);

  timers.runNext();
  assert.equal(FakeWebSocket.instances.length, 3);
});
