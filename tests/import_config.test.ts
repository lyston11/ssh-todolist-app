import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeUtf8Base64 } from '../src/lib/base64.ts';
import { hasImportConfigInUrl, parseImportedConfig, stripSensitiveImportParams } from '../src/lib/import_config.ts';

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

test('parseImportedConfig accepts alias fields used by legacy configs', () => {
  const parsed = parseImportedConfig('{"api":"http://100.64.0.8:8000","apiToken":"secret","wsPort":"8001"}');

  assert.equal(parsed.serverUrl, 'http://100.64.0.8:8000');
  assert.equal(parsed.token, 'secret');
  assert.equal(parsed.wsPort, 8001);
  assert.equal(parsed.wsPath, '/ws');
});

test('parseImportedConfig accepts raw connect-link payload json from services', () => {
  const config64 = encodeUtf8Base64(JSON.stringify({
    serverUrl: 'http://100.64.0.8:8000',
    token: 'service-token',
    wsUrl: 'ws://100.64.0.8:8001/ws',
    wsPort: 8001,
    wsPath: '/ws',
    authRequired: true,
  }));

  const parsed = parseImportedConfig(JSON.stringify({
    config64,
    deepLinkUrl: `com.lyston11.sshtodolist://connect?config64=${config64}`,
    webImportUrl: `https://app.example.com?config64=${config64}`,
  }));

  assert.equal(parsed.serverUrl, 'http://100.64.0.8:8000');
  assert.equal(parsed.token, 'service-token');
  assert.equal(parsed.wsUrl, 'ws://100.64.0.8:8001/ws');
  assert.equal(parsed.authRequired, true);
});

test('parseImportedConfig accepts share text that contains an import link', () => {
  const config64 = encodeUtf8Base64(JSON.stringify({
    serverUrl: 'http://100.64.0.8:8000',
    token: 'share-token',
  }));

  const parsed = parseImportedConfig([
    'SSH Todo 导入链接',
    '节点: http://100.64.0.8:8000',
    `App 导入: com.lyston11.sshtodolist://connect?config64=${config64}`,
    '注意: 链接内包含访问 token，只分享给自己的设备。',
  ].join('\n'));

  assert.equal(parsed.serverUrl, 'http://100.64.0.8:8000');
  assert.equal(parsed.token, 'share-token');
});

test('parseImportedConfig accepts web url config parameter', () => {
  const configValue = encodeURIComponent(JSON.stringify({
    serverUrl: 'http://100.64.0.8:8000',
    token: 'query-token',
    wsPath: '/ws',
  }));

  const parsed = parseImportedConfig(`https://todo-app.example.com/?config=${configValue}`);

  assert.equal(parsed.serverUrl, 'http://100.64.0.8:8000');
  assert.equal(parsed.token, 'query-token');
  assert.equal(parsed.wsPath, '/ws');
});

test('hasImportConfigInUrl and stripSensitiveImportParams work for import links', () => {
  const originalUrl = 'https://todo-app.example.com/?config64=abc123&token=secret&from=share';

  assert.equal(hasImportConfigInUrl(originalUrl), true);
  assert.equal(
    stripSensitiveImportParams(originalUrl),
    'https://todo-app.example.com/?from=share',
  );
});
