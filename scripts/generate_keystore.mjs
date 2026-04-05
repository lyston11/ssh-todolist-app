import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

import { buildJavaEnv, formatJavaResolutionError, formatJavaRuntime, resolveJavaRuntime } from "./lib/java_runtime.mjs";

const env = process.env;
const keystorePath = env.SSH_TODOLIST_ANDROID_STORE_FILE || env.SSH_TODOLIST_KEYSTORE_PATH;
const storePassword = env.SSH_TODOLIST_ANDROID_STORE_PASSWORD || env.SSH_TODOLIST_STORE_PASSWORD;
const keyAlias = env.SSH_TODOLIST_ANDROID_KEY_ALIAS || env.SSH_TODOLIST_KEY_ALIAS;
const keyPassword = env.SSH_TODOLIST_ANDROID_KEY_PASSWORD || env.SSH_TODOLIST_KEY_PASSWORD;
const dname = env.SSH_TODOLIST_ANDROID_DNAME || "CN=ssh-todolist, OU=mobile, O=ssh-todolist, L=Shanghai, ST=Shanghai, C=CN";

const missing = [];
if (!keystorePath) missing.push("SSH_TODOLIST_ANDROID_STORE_FILE");
if (!storePassword) missing.push("SSH_TODOLIST_ANDROID_STORE_PASSWORD");
if (!keyAlias) missing.push("SSH_TODOLIST_ANDROID_KEY_ALIAS");
if (!keyPassword) missing.push("SSH_TODOLIST_ANDROID_KEY_PASSWORD");

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

if (existsSync(keystorePath)) {
  console.error(`Keystore already exists: ${keystorePath}`);
  process.exit(1);
}

const javaRuntime = resolveJavaRuntime(env);
if (!javaRuntime) {
  console.error(formatJavaResolutionError());
  process.exit(1);
}

console.log(`Using ${formatJavaRuntime(javaRuntime)}`);

const keytool = javaRuntime.javaHome ? path.join(javaRuntime.javaHome, "bin", "keytool") : "keytool";

mkdirSync(path.dirname(keystorePath), { recursive: true });

const result = spawnSync(
  keytool,
  [
    "-genkeypair",
    "-v",
    "-storetype",
    "PKCS12",
    "-keystore",
    keystorePath,
    "-alias",
    keyAlias,
    "-keyalg",
    "RSA",
    "-keysize",
    "2048",
    "-validity",
    "3650",
    "-storepass",
    storePassword,
    "-keypass",
    keyPassword,
    "-dname",
    dname,
  ],
  {
    stdio: "inherit",
    env: {
      ...env,
      ...buildJavaEnv(javaRuntime, env),
    },
  },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Created Android keystore: ${keystorePath}`);
