import assert from 'node:assert/strict';
import test from 'node:test';
import { buildScopedStorageKey, decodeUtf8Base64, encodeUtf8Base64 } from '../src/lib/base64.ts';

test('UTF-8 base64 helpers round-trip unicode content', () => {
  const source = 'http://100.88.1.9:8000/导入?token=你好';
  const encoded = encodeUtf8Base64(source);

  assert.equal(decodeUtf8Base64(encoded), source);
});

test('scoped storage keys keep prefix and encoded raw key', () => {
  const source = 'https://todo.example.com/项目';
  const key = buildScopedStorageKey('queue', source);

  assert.ok(key.startsWith('queue_'));
  assert.equal(decodeUtf8Base64(key.slice('queue_'.length)), source);
});
