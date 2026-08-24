package center.akyl.app;

import android.app.Notification;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class NotificationReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        String title=intent.getStringExtra("title"),message=intent.getStringExtra("message");int code=intent.getIntExtra("code",1);
        Notification.Builder builder=android.os.Build.VERSION.SDK_INT>=26?new Notification.Builder(context,"lessons"):new Notification.Builder(context);
        builder.setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle(title).setContentText(message).setAutoCancel(true).setPriority(Notification.PRIORITY_HIGH);
        ((NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE)).notify(code,builder.build());
        long next=intent.getLongExtra("trigger",System.currentTimeMillis())+7L*24*60*60*1000;Intent repeat=new Intent(context,NotificationReceiver.class);repeat.putExtra("title",title);repeat.putExtra("message",message);repeat.putExtra("code",code);repeat.putExtra("trigger",next);PendingIntent pending=PendingIntent.getBroadcast(context,code,repeat,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);((AlarmManager)context.getSystemService(Context.ALARM_SERVICE)).setWindow(AlarmManager.RTC_WAKEUP,next,60000,pending);
    }
}
