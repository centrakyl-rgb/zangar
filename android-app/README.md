# Акыл центр Android APK

Это Android-оболочка для приложения медресе. Она открывает `akyl-center.html` внутри WebView, поэтому первый APK можно собрать без сервера и без интернета внутри самого приложения.

## Что нужно установить

1. Android Studio или Android Command Line Tools.
2. JDK 17.
3. Android SDK Platform 35.
4. Android SDK Build Tools.
5. Gradle 8.9 или Android Studio, который сам скачает Gradle.

## Сборка debug APK

```bash
cd android-app
gradle assembleDebug
```

Готовый файл будет здесь:

```text
android-app/app/build/outputs/apk/debug/app-debug.apk
```

## Сборка через Android Studio

1. Открыть папку `android-app`.
2. Дождаться синхронизации Gradle.
3. Выбрать `Build > Build Bundle(s) / APK(s) > Build APK(s)`.

## Что делать дальше

Для настоящей рабочей версии нужно добавить серверную часть:

- авторизация администратора и преподавателей;
- база данных PostgreSQL;
- таблицы учеников, предметов, оценок, посещаемости, болезней и уведомлений;
- ежедневные резервные копии;
- роли доступа, чтобы преподаватель видел только свои группы.
