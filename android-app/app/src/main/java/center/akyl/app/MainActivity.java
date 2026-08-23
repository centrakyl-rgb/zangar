package center.akyl.app;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.JavascriptInterface;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setWebViewClient(new WebViewClient());
        webView.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override public WindowInsets onApplyWindowInsets(View view, WindowInsets insets) {
                view.setPadding(0, insets.getSystemWindowInsetTop(), 0, insets.getSystemWindowInsetBottom());
                return insets;
            }
        });

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        webView.addJavascriptInterface(new ProjectBridge(), "AkylNative");

        setContentView(webView);
        webView.loadUrl("file:///android_asset/akyl-center.html");
    }

    private class ProjectBridge {
        @JavascriptInterface
        public void refreshProjects() {
            new Thread(() -> {
                String result = "{\"site\":\"https://mechet-zangar.ru/\"}";
                try {
                    HttpURLConnection connection = (HttpURLConnection) new URL("https://mechet-zangar.ru/").openConnection();
                    connection.setConnectTimeout(12000);connection.setReadTimeout(12000);connection.setRequestProperty("User-Agent", "Mozilla/5.0 AkylCenter/1.0");
                    BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), "UTF-8"));StringBuilder html = new StringBuilder();String line;
                    while ((line = reader.readLine()) != null) html.append(line).append('\n');reader.close();
                    String source = html.toString(), text = source.replaceAll("(?is)<script.*?</script>|<style.*?</style>", " ").replaceAll("(?s)<[^>]+>", " ").replace("&nbsp;", " ").replace("&#8381;", "₽");
                    String collected = findAmount(text, "(?:собрано|собрали|уже собрано)"), goal = findAmount(text, "(?:цель|необходимо|требуется|из)");
                    String telegram = findLink(source, "https?://(?:t\\.me|telegram\\.me)/[^\\\"'<> ]+");
                    String vk = findLink(source, "https?://(?:www\\.)?vk\\.(?:com|ru)/[^\\\"'<> ]+");
                    String max = findLink(source, "https?://(?:max\\.ru|web\\.max\\.ru)/[^\\\"'<> ]+");
                    result = "{\"site\":\"https://mechet-zangar.ru/\",\"collected\":" + JSONObject.quote(collected) + ",\"goal\":" + JSONObject.quote(goal) + ",\"telegram\":" + JSONObject.quote(telegram) + ",\"vk\":" + JSONObject.quote(vk) + ",\"max\":" + JSONObject.quote(max) + "}";
                } catch (Exception ignored) {}
                final String payload=result;webView.post(() -> webView.evaluateJavascript("window.receiveProjectData(" + JSONObject.quote(payload) + ")", null));
            }).start();
        }
        private String findAmount(String text,String label){Matcher m=Pattern.compile("(?iu)"+label+"[^0-9]{0,100}([0-9][0-9\\s\\u00a0.,]{0,20})\\s*(?:₽|руб(?:лей|ля|\\.)?)").matcher(text);return m.find()?m.group(1).replaceAll("[\\s\\u00a0]", "").replace(',', '.'):"";}
        private String findLink(String html,String expression){Matcher m=Pattern.compile(expression,Pattern.CASE_INSENSITIVE).matcher(html);return m.find()?m.group().replace("&amp;", "&"):"";}
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }
}
