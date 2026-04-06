import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LOCAL_WORKSPACE_KEY,
  createDefaultLocalList,
  createLocalNode,
  getNodeAddressLabel,
  getNodeStatusLabel,
  isLocalNode,
} from '../src/lib/nodes.ts';

test('createLocalNode builds a stable local workspace node', () => {
  const node = createLocalNode();

  assert.equal(node.kind, 'local');
  assert.equal(node.ip, LOCAL_WORKSPACE_KEY);
  assert.equal(isLocalNode(node), true);
});

test('local helpers expose readable labels', () => {
  const node = createLocalNode();

  assert.equal(getNodeAddressLabel(node), '仅保存在当前设备');
  assert.equal(getNodeStatusLabel(node, 'offline'), 'Local Workspace');
});

test('createDefaultLocalList keeps the expected default list id', () => {
  const list = createDefaultLocalList(123);

  assert.equal(list.id, 'local-default-list');
  assert.equal(list.createdAt, 123);
});
