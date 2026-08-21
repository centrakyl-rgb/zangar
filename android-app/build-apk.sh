#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export LD_LIBRARY_PATH="${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk-amd64}/lib:${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk-amd64}/lib/jli:${LD_LIBRARY_PATH:-}"

if ! command -v java >/dev/null 2>&1; then
  echo "Java не найдена. Установите JDK 17." >&2
  exit 1
fi

if ! command -v gradle >/dev/null 2>&1; then
  echo "Gradle не найден. Установите Gradle 8.9 или откройте проект в Android Studio." >&2
  exit 1
fi

cd "$ROOT_DIR"
gradle assembleDebug

echo "APK: $ROOT_DIR/app/build/outputs/apk/debug/app-debug.apk"
