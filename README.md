# ssh-todolist-app

`ssh-todolist-app` 是 Focus List 的独立应用工程，负责 Web UI、Android 打包、离线缓存和同步交互。

## 职责

- 提供 Todo / List 的前端界面
- 维护本地缓存与离线待同步队列
- 连接独立的 `ssh-todolist-services` 节点
- 通过 Capacitor 打包为 Android 应用

## 目录

- `index.html`: 页面骨架
- `styles.css`: 样式
- `app.js`: 前端编排入口
- `frontend/`: API、realtime、state、ui、offline 分层代码
- `scripts/prepare_mobile.mjs`: 生成 Capacitor Web 资源
- `scripts/serve_web.mjs`: 本地静态预览服务
- `android/`: Capacitor Android 工程
- `tests/frontend_offline.test.mjs`: 前端离线逻辑回归测试

## 安装与运行

```bash
cd ssh-todolist-app
conda run -n ssh-todolist npm run web:serve
```

默认会在 `4173` 端口启动静态服务。

## 连接同步服务

App 和 service 已拆分，不再默认把当前页面地址当作同步节点。

你有三种方式配置同步节点：

1. 打开页面后手动填写，例如 `http://100.x.x.x:8000`
2. 同时输入服务端 token
3. 使用 URL 参数预置：

```text
http://127.0.0.1:4173/?server=http://127.0.0.1:8000&token=your-shared-token
```
4. 在 Android App 或浏览器里保存一次后，后续从本地存储恢复

说明：

- REST 请求会自动带 `Authorization: Bearer <token>`
- WebSocket 连接会自动带上 token 参数
- token 错误时不会误进入离线队列

## Android

```bash
cd ssh-todolist-app
conda run -n ssh-todolist npm run mobile:prepare
conda run -n ssh-todolist npm run android:sync
conda run -n ssh-todolist npm run android:open
```

说明：

- Android 包内只包含前端静态资源
- 真正的同步节点仍然是独立部署的 `ssh-todolist-services`
- App 内需配置 Tailscale 节点地址和 token

## 校验

```bash
cd ssh-todolist-app
conda run -n ssh-todolist npm run check
conda run -n ssh-todolist npm test
```
