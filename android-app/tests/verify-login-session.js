const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app/src/main/assets/supabase-app.js"), "utf8");
const gradle = fs.readFileSync(path.join(root, "app/build.gradle"), "utf8");
const manifest = fs.readFileSync(path.join(root, "app/src/main/AndroidManifest.xml"), "utf8");

function requireMatch(value, pattern, message) {
  if (!pattern.test(value)) throw new Error(message);
}

requireMatch(app, /REQUEST_TIMEOUT_MS=12000/, "12-second request timeout is missing");
requireMatch(app, /FALLBACK_DIRECTORY/, "fallback employee directory is missing");
requireMatch(app, /login_directory"\s*,\s*\{[^}]*auth:false/, "login_directory must not receive a stale bearer token");
requireMatch(app, /grant_type=refresh_token"\s*,\s*\{[^}]*auth:false/, "refresh request must not receive a stale bearer token");
requireMatch(app, /function clearSession\(\)[\s\S]*removeItem\("akyl_auth"\)[\s\S]*token="";refreshToken="";sessionExpiresAt=0/, "complete session cleanup is missing");
requireMatch(app, /async function restoreSavedSession/, "bounded session restoration is missing");

const showLoginAt = app.lastIndexOf("  showLogin();");
const directoryAt = app.lastIndexOf("  loadLoginDirectory();");
const restoreAt = app.lastIndexOf("restoreSavedSession(saved)");
if (showLoginAt < 0 || directoryAt < showLoginAt || restoreAt < directoryAt) {
  throw new Error("fallback login must render before saved-session restoration");
}

requireMatch(gradle, /applicationId "center\.akyl\.app\.live11"/, "package ID changed");
requireMatch(gradle, /versionCode 7/, "versionCode must be 7");
requireMatch(gradle, /versionName "2\.1\.3"/, "versionName must be 2.1.3");
requireMatch(manifest, /android:allowBackup="false"/, "WebView session data must not be backed up");

console.log("Akyl login/session invariants verified.");
