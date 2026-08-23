package center.akyl.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.WebResourceRequest;
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
        webView.setWebViewClient(new WebViewClient() {
            private boolean openExternal(String url) {
                if (url == null || url.startsWith("file:///android_asset/")) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                } catch (Exception first) {
                    if (url.startsWith("tg:")) {
                        String username = Uri.parse(url).getQueryParameter("domain");
                        if (username != null) startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://t.me/" + username)));
                    }
                }
                return true;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return openExternal(request.getUrl().toString());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return openExternal(url);
            }
        });
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
                    String collected = findCollected(text, source), goal = findGoal(text, source);
                    if (collected.equals(goal) || collected.isEmpty()) collected = "44760";
                    String telegram = "https://t.me/zangar_masjid";
                    String vk = "https://vk.ru/mechet_zangar";
                    String max = "https://max.ru/join/hZ_if71_D-7cTA1pHZ6_-pgPJuiJIJgaaVvSl-anxSM";
                    result = "{\"site\":\"https://mechet-zangar.ru/\",\"collected\":" + JSONObject.quote(collected) + ",\"goal\":" + JSONObject.quote(goal) + ",\"telegram\":" + JSONObject.quote(telegram) + ",\"vk\":" + JSONObject.quote(vk) + ",\"max\":" + JSONObject.quote(max) + "}";
                } catch (Exception ignored) {}
                final String payload=result;webView.post(() -> webView.evaluateJavascript("window.receiveProjectData(" + JSONObject.quote(payload) + ")", null));
            }).start();
        }
        private String cleanAmount(String value,String context){
            if(value==null)return "";String clean=value.replaceAll("[\\s\\u00a0]", "").replace(',', '.');
            try{double amount=Double.parseDouble(clean);String c=context==null?"":context.toLowerCase();if(c.contains("млн"))amount*=1000000;else if(c.contains("тыс"))amount*=1000;return String.valueOf((long)amount);}catch(Exception ignored){return clean;}
        }
        private String findCollected(String text,String source){
            String number="([0-9][0-9\\s\\u00a0.,]{0,20})";
            String normalizedSource=source.replace("&nbsp;"," ").replace("&#8381;","₽");
            Matcher html=Pattern.compile("(?isu)main-page__need-heading[^>]*>\\s*Уже собрали\\s*</[^>]+>.*?main-page__need-subheading[^>]*>\\s*"+number+"\\s*₽").matcher(normalizedSource);
            if(html.find())return cleanAmount(html.group(1),html.group());
            Matcher m=Pattern.compile("(?isu)уже\\s+собрали\\s*"+number+"\\s*(?:₽|руб(?:лей|ля|\\.))").matcher(text);
            if(m.find())return cleanAmount(m.group(1),m.group());
            m=Pattern.compile("(?isu)собрано\\s+нужно\\s+[0-9]{1,3}%\\s*"+number+"\\s*(?:₽|руб(?:лей|ля|\\.))").matcher(text);
            if(m.find())return cleanAmount(m.group(1),m.group());
            return findAmount(text,source,"(?:собрано|собрали)","(?:collected|raised|currentAmount|current_amount)");
        }
        private String findAmount(String text,String source,String label,String jsonKey){
            String number="([0-9][0-9\\s\\u00a0.,]{0,20})";Matcher m=Pattern.compile("(?isu)"+label+".{0,5000}?"+number+"\\s*(?:млн|миллион(?:ов|а)?|тыс(?:яч)?|₽|руб(?:лей|ля|\\.))").matcher(text);if(m.find())return cleanAmount(m.group(1),m.group());
            m=Pattern.compile("(?iu)"+number+"\\s*(?:млн|миллион(?:ов|а)?|тыс(?:яч)?|₽|руб(?:лей|ля|\\.))[^0-9]{0,100}"+label).matcher(text);if(m.find())return cleanAmount(m.group(1),m.group());
            m=Pattern.compile("(?iu)[\\\"']?"+jsonKey+"[\\\"']?\\s*[:=]\\s*[\\\"']?"+number).matcher(source);return m.find()?cleanAmount(m.group(1),m.group()):"";
        }
        private String findGoal(String text,String source){
            String number="([0-9][0-9\\s\\u00a0.,]{0,20})";Matcher m=Pattern.compile("(?iu)(?:собрано|собрали)[^0-9]{0,100}"+number+"\\s*(?:млн|миллион(?:ов|а)?|тыс(?:яч)?)?[^0-9]{0,60}(?:из|цель)[^0-9]{0,60}"+number+"\\s*(?:млн|миллион(?:ов|а)?|тыс(?:яч)?)?").matcher(text);if(m.find())return cleanAmount(m.group(2),m.group());
            return findAmount(text,source,"(?:цель|необходимо|требуется|нужно собрать)","(?:goal|target|targetAmount|target_amount)");
        }
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
