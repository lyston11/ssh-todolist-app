import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeUtf8Base64 } from '../src/lib/base64.ts';
import { parseImportedConfig } from '../src/lib/import_config.ts';

test('parseImportedConfig accepts raw json', () => {
  const parsed = parseImportedConfig('{"serverUrl":"http://100.64.0.8:8000","token":"secret"}');

  assert.equal(parsed.serverUrl, 'http://100.64.0.8:8000');
  assert.equal(parsed.token, 'secret');
});

test('parseImportedConfig accepts config64 import url', () => {
  const config64 = encodeUtf8Base64(JSON.stringify({
    serverUrl: 'http://100.64.0.8:8000',
    token: '你好-token',
  }));

  const parsed = parseImportedConfig(`com.lyston11.sshtodolist://connect?config64=${config64}`);

  assert.equal(parsed.serverUrl, 'http://100.64.0.8:8000');
  assert.equal(parsed.token, '你好-token');
});
