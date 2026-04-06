import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeServerUrl } from '../src/lib/connection.ts';

test('normalizeServerUrl adds scheme and default http port', () => {
  assert.equal(normalizeServerUrl('100.64.0.8'), 'http://100.64.0.8:8000');
});

test('normalizeServerUrl preserves explicit ports', () => {
  assert.equal(normalizeServerUrl('https://todo.example.com:9443'), 'https://todo.example.com:9443');
});

test('normalizeServerUrl rejects empty values', () => {
  assert.throws(() => normalizeServerUrl('   '), /请先填写节点地址/);
});
