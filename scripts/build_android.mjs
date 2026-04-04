import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const projectRoot = process.cwd();
const androidDir = path.join(projectRoot, "android");

const mode = process.argv[2] || "debug";
const tasks = {
  debug: {
    gradleTask: "app:assembleDebug",
    outputPath: path.join(androidDir, "app/build/outputs/apk/debug/app-debug.apk"),
  },
  release: {
    gradleTask: "app:assembleRelease",
    outputPath: path.join(androidDir, "app/build/outputs/apk/release/app-release.apk"),
    fallbackOutputPath: path.join(androidDir, "app/build/outputs/apk/release/app-release-unsigned.apk"),
  },
  bundle: {
    gradleTask: "app:bundleRelease",
    outputPath: path.join(androidDir, "app/build/outputs/bundle/release/app-release.aab"),
  },
};

if (!tasks[mode]) {
  console.error(`Unknown Android build mode: ${mode}`);
  console.error("Use one of: debug, release, bundle");
  process.exit(1);
}

const javaHomes = [
  process.env.JAVA_HOME,
  "/Users/lyston/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home",
  "/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home",
].filter(Boolean);

const javaHome = javaHomes.find((candidate) => existsSync(candidate));

if (!javaHome) {
  console.error("Java 21 not found. Set JAVA_HOME to a Java 21 installation before building Android.");
  process.exit(1);
}

function run(command, args, cwd, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: {
      ...process.env,
      JAVA_HOME: javaHome,
      PATH: `${path.join(javaHome, "bin")}:${process.env.PATH || ""}`,
      ...extraEnv,
    },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("npm", ["run", "android:sync"], projectRoot);
run("./gradlew", [tasks[mode].gradleTask], androidDir);

const outputPath = existsSync(tasks[mode].outputPath)
  ? tasks[mode].outputPath
  : tasks[mode].fallbackOutputPath;

if (outputPath) {
    console.log(`Android artifact: ${outputPath}`);
}
