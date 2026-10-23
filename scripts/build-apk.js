#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const isDebug = process.argv[2] === 'debug';
const gradleTask = isDebug ? 'assembleDebug' : 'assembleRelease';
const projectRoot = path.resolve(__dirname, '..');
const androidDir = path.join(projectRoot, 'apps', 'mobile', 'android');

// Resolve JAVA_HOME if not present in environment
if (!process.env.JAVA_HOME) {
  if (process.platform === 'win32') {
    const commonWindowsPaths = [
      'C:\\Program Files\\Java\\jdk-21',
      'C:\\Program Files\\Eclipse Adoptium\\jdk-21-hotspot',
      'C:\\Program Files\\Microsoft\\jdk-21'
    ];
    for (const p of commonWindowsPaths) {
      if (fs.existsSync(p)) {
        process.env.JAVA_HOME = p;
        break;
      }
    }
  }
}

const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';

console.log(`[TripMate Build] Running Gradle task: ${gradleTask}`);
console.log(`[TripMate Build] Working Directory: ${androidDir}`);
if (process.env.JAVA_HOME) {
  console.log(`[TripMate Build] Using JAVA_HOME: ${process.env.JAVA_HOME}`);
}

const result = spawnSync(gradlew, [gradleTask], {
  cwd: androidDir,
  stdio: 'inherit',
  shell: true,
  env: process.env
});

if (result.status !== 0) {
  console.error(`\n[TripMate Build] Gradle failed with exit code ${result.status}`);
  process.exit(result.status || 1);
}

const variant = isDebug ? 'debug' : 'release';
const apkOutput = path.join(androidDir, 'app', 'build', 'outputs', 'apk', variant, `app-${variant}.apk`);
if (fs.existsSync(apkOutput)) {
  const stat = fs.statSync(apkOutput);
  console.log(`\n======================================================`);
  console.log(`✅ Build Succeeded!`);
  console.log(`APK Output: ${apkOutput}`);
  console.log(`Size: ${(stat.size / 1024 / 1024).toFixed(1)} MB (${stat.size} bytes)`);
  console.log(`======================================================\n`);

  if (!isDebug) {
    const rootApk = path.join(projectRoot, 'TripMate-release.apk');
    try {
      fs.copyFileSync(apkOutput, rootApk);
      console.log(`Copied to root: ${rootApk}`);
    } catch (e) {
      // copy error non-fatal
    }
  }
}
