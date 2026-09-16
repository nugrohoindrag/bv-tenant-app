// Build APK Android via Gradle wrapper (setelah `cap sync`). Pakai: node scripts/build-android.mjs [debug|release]
// Env: JAVA_HOME (JDK 17+), ANDROID_HOME (default toolchain portable D:/tools/jdk-17 & D:/Android/Sdk bila ada).
// Output: android/app/build/outputs/apk/<variant>/app-<variant>.apk
import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const variant = process.argv[2] === "release" ? "Release" : "Debug";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const androidDir = path.join(root, "android");
if (!fs.existsSync(androidDir)) {
  console.error("Folder android/ belum ada. Jalankan: npx cap add android");
  process.exit(1);
}
const isWin = process.platform === "win32";
const gradlew = path.join(androidDir, isWin ? "gradlew.bat" : "gradlew");
const env = { ...process.env };
if (!env.JAVA_HOME || /jdk-17/.test(env.JAVA_HOME)) {
  // Capacitor 7 / AGP 8.7 butuh JDK 21
  if (fs.existsSync("D:/tools/jdk-21")) env.JAVA_HOME = "D:/tools/jdk-21";
}
if (!env.ANDROID_HOME && fs.existsSync("D:/Android/Sdk")) env.ANDROID_HOME = "D:/Android/Sdk";
const localProps = path.join(androidDir, "local.properties");
if (!fs.existsSync(localProps) && env.ANDROID_HOME) fs.writeFileSync(localProps, `sdk.dir=${env.ANDROID_HOME.split("\\").join("/")}\n`);
console.log(`> gradlew assemble${variant}`);
const r = spawnSync(`"${gradlew}"`, [`assemble${variant}`, "--no-daemon"], { cwd: androidDir, stdio: "inherit", env, shell: true });
if (r.status !== 0) process.exit(r.status ?? 1);
const apk = path.join(androidDir, "app/build/outputs/apk", variant.toLowerCase(), `app-${variant.toLowerCase()}${variant === "Release" ? "-unsigned" : ""}.apk`);
console.log(fs.existsSync(apk) ? `APK: ${apk}` : "Build selesai; cek android/app/build/outputs/apk/");
