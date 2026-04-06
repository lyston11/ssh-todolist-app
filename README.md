# ssh-todolist-app

`ssh-todolist-app` 是 SSH Todo 的独立应用工程，负责 Web UI、Android 打包、离线缓存和同步交互。

## 职责

- 提供 Todo / List 的前端界面
- 维护本地缓存与离线待同步队列
- 连接独立的 `ssh-todolist-services` 节点
- 通过 Capacitor 打包为 Android 应用
- 在 Android 端支持扫码导入连接配置
- 检测本机 Tailscale 地址并测试候选节点
- 在前后台切换和网络恢复后自动重连同步

## 目录

- `index.html`: 页面骨架
- `src/`: React + TypeScript 前端源码
- `src/api/`: REST API 客户端
- `src/realtime/`: WebSocket 同步层
- `src/state/`: 连接状态与 Todo 状态管理
- `src/features/`: 连接、任务、设置等页面模块
- `scripts/build_android.mjs`: Android 构建脚本
- `scripts/generate_keystore.mjs`: Android 签名文件生成脚本
- `android/`: Capacitor Android 工程

## 安装与运行

```bash
cd ssh-todolist-app
conda run -n ssh-todolist npm run web:serve
```

默认会在 `4173` 端口启动静态服务。

构建独立 Web 静态资源：

```bash
cd ssh-todolist-app
conda run -n ssh-todolist npm run build
```

产物会输出到 `dist/`。

## 连接同步服务

App 和 service 已拆分，不再默认把当前页面地址当作同步节点。

你有多种方式配置同步节点：

1. 打开页面后手动填写，例如 `http://100.x.x.x:8000`
2. 同时输入服务端 token
3. 先输入节点地址，再点击“拉取配置”，由 app 直接请求 `GET /api/connect-config`
4. 直接粘贴 `ssh-todolist-services` 启动时输出的连接配置 JSON，或 `GET /api/connect-config` 返回结果
5. 使用 URL 参数预置：

```text
http://127.0.0.1:4173/?server=http://127.0.0.1:8000
```
6. 在 Android App 或浏览器里保存一次后，后续从本地存储恢复
7. 使用链接直接导入完整配置：

```text
http://127.0.0.1:4173/?config=%7B%22serverUrl%22%3A%22http%3A%2F%2F100.x.x.x%3A8000%22%2C%22token%22%3A%22your-token%22%7D
```

也支持更适合分享的 `config64=` URL-safe Base64 形式。

Android 自定义 scheme 也已接入，后续可直接使用类似：

```text
com.lyston11.sshtodolist://connect?config64=...
```

导入配置说明：

- 支持导入 `serverUrl` / `token` / `wsUrl` / `wsPort` / `wsPath`
- 也兼容 `api` / `apiToken` 这样的别名字段
- 如果服务端要求 token 但导入 JSON 里没有 token，app 会先导入节点地址，等待你补充 token
- 最近成功连接过的节点会保存在本地，移动端可一键回连或删除
- 浏览器和 WebView 不再把 token 持久化到 `localStorage`；token 仅保留在当前会话中
- 最近节点记录只保留节点地址、是否需要鉴权和最近使用时间，不再保存明文 token
- 设置页顶部会根据当前状态显示接入引导卡，首次安装和移动端回连会更顺手
- 首次安装且没有任何已保存节点时，会弹出首启引导层，优先带你完成第一次接入
- 如果 URL 中带有 `config=` 或 `config64=`，app 启动后会自动导入这份连接配置

说明：

- REST 请求会自动带 `Authorization: Bearer <token>`
- WebSocket 连接会自动带上 token 参数
- token 错误时不会误进入离线队列
- 如果通过旧链接把 token 放进 URL，app 启动后会立即从地址栏清掉这些敏感参数
- Android 原生端可直接扫码导入服务端二维码或连接链接
- Web 端可通过选择二维码截图或相机照片识别导入
- “读取本机网络”会尝试显示本机 Tailscale 地址，并生成可测试的候选节点
- 检测到 Tailscale IPv6 时，会自动使用带 `[]` 的合法 URL 形式参与测试
- “测试候选节点”会测试当前输入节点、最近节点和本机候选地址
- 页面回到前台、网络恢复后会自动尝试恢复 WebSocket 和补同步

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
- `src/lib/bridge.ts` 依赖 Capacitor 原生插件 `DeviceBridge` / `IncomingLink`
- 如果没有接入原生插件，Web 端和普通浏览器会自动回退到只显示占位网络信息
- 当前 Android 构建脚本支持 Java 17 及以上
- 当前本机 SDK 路径可写在 `android/local.properties` 中，例如 `sdk.dir=/Users/lyston/Library/Android/sdk`
- `npm run android:build:*` 和 `npm run android:keystore` 会优先使用 `JAVA_HOME`，其次尝试 macOS `/usr/libexec/java_home`，最后回退到 `PATH` 中的 JDK
- Android 应用已关闭系统备份，避免把本地保存的节点配置和 token 带进系统备份

构建 APK：

```bash
cd ssh-todolist-app
conda run -n ssh-todolist npm run mobile:prepare
conda run -n ssh-todolist npm run android:sync
conda run -n ssh-todolist ./gradlew app:assembleDebug
conda run -n ssh-todolist ./gradlew app:assembleRelease
```

前提是当前 shell 已经能找到 Java 17+。如果你不想自己处理 `JAVA_HOME`，优先使用下面封装好的 `npm run android:build:*`。

也可以直接使用工程脚本：

```bash
cd ssh-todolist-app
conda run -n ssh-todolist npm run android:build:debug
conda run -n ssh-todolist npm run android:build:release
conda run -n ssh-todolist npm run android:build:aab
```

默认产物路径：

- `android/app/build/outputs/apk/debug/app-debug.apk`
- `android/app/build/outputs/apk/release/app-release.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

GitHub 自动发布：

- 仓库已配置 GitHub Actions 工作流 [android-release.yml](/Users/lyston/PycharmProjects/ssh-todolist/ssh-todolist-app/.github/workflows/android-release.yml)
- 推送到 `main` 时会自动构建并上传 Android artifacts
- 推送 `v*` 标签时会自动创建 GitHub Release，并附带：
  - `app-debug.apk`
  - `app-release.apk` 或 `app-release-unsigned.apk`
  - `app-release.aab`
- 如果给 GitHub 仓库配置了以下 secrets，CI 会自动生成已签名 release 包：
  - `SSH_TODOLIST_ANDROID_KEYSTORE_BASE64`
  - `SSH_TODOLIST_ANDROID_STORE_PASSWORD`
  - `SSH_TODOLIST_ANDROID_KEY_ALIAS`
  - `SSH_TODOLIST_ANDROID_KEY_PASSWORD`

版本：

- Android `versionName` 当前为 `1.00`
- `package.json` 当前版本为 `1.0.0`

正式签名：

- `android/signing.properties.example` 给出了签名配置模板
- 你可以创建 `android/signing.properties`，或直接设置环境变量：
  - `SSH_TODOLIST_ANDROID_STORE_FILE`
  - `SSH_TODOLIST_ANDROID_STORE_PASSWORD`
  - `SSH_TODOLIST_ANDROID_KEY_ALIAS`
  - `SSH_TODOLIST_ANDROID_KEY_PASSWORD`
- 如果没有配置签名，`assembleRelease` 产物会是未签名的 `app-release-unsigned.apk`
- 如果已经配置签名，`assembleRelease` 产物会是可分发的 `app-release.apk`

生成 keystore：

```bash
cd ssh-todolist-app
export SSH_TODOLIST_ANDROID_STORE_FILE="$PWD/android/ssh-todolist-release.jks"
export SSH_TODOLIST_ANDROID_STORE_PASSWORD="replace-me"
export SSH_TODOLIST_ANDROID_KEY_ALIAS="ssh-todolist"
export SSH_TODOLIST_ANDROID_KEY_PASSWORD="replace-me"
conda run -n ssh-todolist npm run android:keystore
```

注意：

- `android/signing.properties`、`.jks`、`.keystore` 已加入 `.gitignore`
- release 包真正可分发前，建议使用你自己的 keystore 和强密码

## 校验

```bash
cd ssh-todolist-app
conda run -n ssh-todolist npm run check
conda run -n ssh-todolist npm test
conda run -n ssh-todolist npm run build
```
