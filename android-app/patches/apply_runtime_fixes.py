from pathlib import Path

path = Path("android-app/app/src/main/java/center/akyl/app/MainActivity.java")
text = path.read_text(encoding="utf-8")

text = text.replace(
    "import android.app.PendingIntent;\n",
    "import android.app.PendingIntent;\nimport android.print.PrintAttributes;\nimport android.print.PrintDocumentAdapter;\nimport android.print.PrintManager;\n"
)

needle = '''    private class ProjectBridge {
        @JavascriptInterface
        public void scheduleNotifications(String payload) {'''
replacement = '''    private class ProjectBridge {
        @JavascriptInterface
        public void printPage() {
            webView.post(() -> {
                PrintManager manager=(PrintManager)getSystemService(Context.PRINT_SERVICE);
                PrintDocumentAdapter adapter=webView.createPrintDocumentAdapter("Расписание Акыл центр");
                manager.print("Расписание Акыл центр",adapter,new PrintAttributes.Builder().build());
            });
        }
        @JavascriptInterface
        public void scheduleNotifications(String payload) {'''
if needle not in text:
    raise SystemExit("print bridge insertion point not found")
text = text.replace(needle, replacement)

text = text.replace(
    'String result = "{\\\"site\\\":\\\"https://mechet-zangar.ru/\\\"}";',
    'String result = "{\\\"site\\\":\\\"https://mechet-zangar.ru/\\\",\\\"collected\\\":\\\"45145\\\",\\\"goal\\\":\\\"350000\\\"}";'
)
text = text.replace(
    'connection.setUseCaches(false);connection.setConnectTimeout(12000);connection.setReadTimeout(12000);connection.setRequestProperty("Cache-Control", "no-cache, no-store, max-age=0");connection.setRequestProperty("Pragma", "no-cache");connection.setRequestProperty("User-Agent", "Mozilla/5.0 AkylCenter/1.0");',
    'connection.setInstanceFollowRedirects(true);connection.setUseCaches(false);connection.setConnectTimeout(15000);connection.setReadTimeout(15000);connection.setRequestProperty("Cache-Control", "no-cache, no-store, max-age=0");connection.setRequestProperty("Pragma", "no-cache");connection.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36");connection.setRequestProperty("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");connection.setRequestProperty("Accept-Language", "ru-RU,ru;q=0.9");connection.setRequestProperty("Referer", "https://mechet-zangar.ru/");'
)

path.write_text(text, encoding="utf-8")
