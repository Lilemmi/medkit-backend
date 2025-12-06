import Constants from "expo-constants";
import * as Notifications from "expo-notifications";

// Универсальная настройка уведомлений
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,

    // 🔥 новые обязательные поля
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerPushToken() {
  // 🔒 Получить разрешения
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push permission denied");
    return null;
  }

  // 🔥 Получить Expo Push Token
  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    return tokenResponse.data;
  } catch (e) {
    // Тихая обработка ошибки - Firebase может быть не настроен
    // Это не критично для работы приложения
    if (e?.message?.includes("FirebaseApp") || e?.message?.includes("Firebase")) {
      console.log("Push notifications: Firebase not configured (optional feature)");
    } else {
      console.log("Push token error:", e?.message || e);
    }
    return null;
  }
}
