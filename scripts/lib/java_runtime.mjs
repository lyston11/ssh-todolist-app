import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

export const MIN_JAVA_VERSION = 17;

export function resolveJavaRuntime(env = process.env) {
  const candidates = [
    inspectJavaHome(env.JAVA_HOME, "JAVA_HOME"),
    inspectMacOSJavaHome(),
    inspectPathJavaRuntime(),
  ].filter(Boolean);

  return candidates.find((candidate) => candidate.version >= MIN_JAVA_VERSION) ?? null;
}

export function buildJavaEnv(runtime, env = process.env) {
  if (!runtime?.javaHome) {
    return {};
  }

  return {
    JAVA_HOME: runtime.javaHome,
    PATH: `${path.join(runtime.javaHome, "bin")}:${env.PATH || ""}`,
  };
}

export function formatJavaRuntime(runtime) {
  if (!runtime) {
    return "";
  }

  const location = runtime.javaHome ? ` (${runtime.javaHome})` : "";
  return `Java ${runtime.version} via ${runtime.source}${location}`;
}

export function formatJavaResolutionError() {
  return (
    `Java ${MIN_JAVA_VERSION}+ not found. ` +
    "Set JAVA_HOME, use a JDK discoverable by /usr/libexec/java_home on macOS, or ensure javac is on PATH."
  );
}

function inspectJavaHome(javaHome, source) {
  const normalizedJavaHome = normalizeJavaHome(javaHome);
  if (!normalizedJavaHome || !isJavaHome(normalizedJavaHome)) {
    return null;
  }

  const version = readJavaVersion(path.join(normalizedJavaHome, "bin", "javac"));
  if (version === null) {
    return null;
  }

  return {
    source,
    javaHome: normalizedJavaHome,
    version,
  };
}

function inspectMacOSJavaHome() {
  if (process.platform !== "darwin") {
    return null;
  }

  const result = spawnSync("/usr/libexec/java_home", ["-v", `${MIN_JAVA_VERSION}+`], {
    encoding: "utf8",
  });
  if (result.error || result.status !== 0) {
    return null;
  }

  return inspectJavaHome(result.stdout.trim(), "macOS java_home");
}

function inspectPathJavaRuntime() {
  const version = readJavaVersion("javac");
  if (version === null) {
    return null;
  }

  return {
    source: "PATH",
    javaHome: inferJavaHomeFromPath(),
    version,
  };
}

function inferJavaHomeFromPath() {
  const result = spawnSync("java", ["-XshowSettings:properties", "-version"], {
    encoding: "utf8",
  });
  if (result.error || result.status !== 0) {
    return null;
  }

  const output = `${result.stdout}\n${result.stderr}`;
  const match = output.match(/^\s*java\.home = (.+)$/m);
  if (!match) {
    return null;
  }

  const javaHome = normalizeJavaHome(match[1]);
  return javaHome && isJavaHome(javaHome) ? javaHome : null;
}

function readJavaVersion(command) {
  const result = spawnSync(command, ["-version"], {
    encoding: "utf8",
  });
  if (result.error || result.status !== 0) {
    return null;
  }

  return parseJavaMajorVersion(`${result.stdout}\n${result.stderr}`);
}

function parseJavaMajorVersion(output) {
  const match =
    output.match(/(?:javac|java)\s+(\d+)(?:\.(\d+))?/i) ??
    output.match(/version "(\d+)(?:\.(\d+))?/i);
  if (!match) {
    return null;
  }

  const major = Number(match[1]);
  if (!Number.isFinite(major)) {
    return null;
  }

  if (major === 1 && match[2]) {
    return Number(match[2]);
  }

  return major;
}

function normalizeJavaHome(javaHome) {
  if (typeof javaHome !== "string") {
    return null;
  }

  const normalizedJavaHome = javaHome.trim();
  return normalizedJavaHome || null;
}

function isJavaHome(javaHome) {
  return existsSync(path.join(javaHome, "bin", "java")) && existsSync(path.join(javaHome, "bin", "javac"));
}
