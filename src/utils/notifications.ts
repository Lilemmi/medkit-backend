import Constants from "expo-constants";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";

const NOTIFICATION_SETTINGS_KEY = "notification_settings";

interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  lightsEnabled: boolean;
  badgeEnabled: boolean;
  lockscreenVisible: boolean;
  repeatEnabled: boolean; // Включить повторяющиеся уведомления
  repeatInterval: number; // Интервал повторения в минутах (5, 10, 15, 20, 30, 60)
  repeatCount: number; // Количество повторений (максимум)
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  lightsEnabled: true,
  badgeEnabled: true,
  lockscreenVisible: true,
  repeatEnabled: true, // Повторяющиеся уведомления включены по умолчанию
  repeatInterval: 5, // Повторять каждые 5 минут
  repeatCount: 12, // Максимум 12 повторений (1 час)
};

export async function loadNotificationSettings(): Promise<NotificationSettings> {
  try {
    const saved = await SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaultSettings, ...parsed };
    }
  } catch (error) {
    console.log("Error loading notification settings:", error);
  }
  return defaultSettings;
}

// 🔔 Настройка канала уведомлений для Android с учетом сохраненных настроек
export async function setupNotificationChannel(customSettings?: NotificationSettings) {
  if (Platform.OS === "android") {
    const settings = customSettings || await loadNotificationSettings();
    
    // На Android каналы нельзя изменить после создания, поэтому удаляем старые и создаем заново
    // Это гарантирует, что звук будет всегда включен для лекарств
    try {
      await Notifications.deleteNotificationChannelAsync("medication-reminders");
      await Notifications.deleteNotificationChannelAsync("medication-reminder");
      await Notifications.deleteNotificationChannelAsync("medication-expired");
      await Notifications.deleteNotificationChannelAsync("medication-expiry");
      await Notifications.deleteNotificationChannelAsync("medication-alert");
      await Notifications.deleteNotificationChannelAsync("medication-stock");
    } catch (error) {
      // Игнорируем ошибки, если каналы не существуют
      console.log("Каналы не найдены или уже удалены, создаем новые");
    }
    
    // Всегда используем MAX importance для критических уведомлений о лекарствах
    // Это гарантирует работу даже при выключенном звуке (через вибрацию и свет)
    // Используем системный звук уведомлений Android, который воспроизводится даже при выключенном звуке
    await Notifications.setNotificationChannelAsync("medication-reminders", {
      name: "Напоминания о лекарствах",
      description: "Критически важные напоминания о приеме лекарств",
      importance: Notifications.AndroidImportance.MAX, // Всегда MAX для критических уведомлений
      vibrationPattern: [0, 250, 250, 250, 250, 250], // Длинная вибрация для привлечения внимания
      lightColor: "#FF0000", // Красный цвет для важности
      sound: "default", // Звук ВСЕГДА включен для критических уведомлений о лекарствах
      enableVibrate: true, // Всегда включена вибрация
      enableLights: true, // Всегда включен свет
      showBadge: true, // Всегда показываем badge
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC, // Всегда видно на заблокированном экране
      bypassDnd: true, // Обход режима "Не беспокоить" (если доступно)
    });
    
    // Также создаем канал для обычных напоминаний
    await Notifications.setNotificationChannelAsync("medication-reminder", {
      name: "Напоминания о лекарствах",
      description: "Критически важные напоминания о приеме лекарств",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250, 250, 250],
      lightColor: "#FF0000",
      sound: "default", // Звук ВСЕГДА включен для критических уведомлений о лекарствах
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
    
    // Канал для уведомлений о просроченных лекарствах
    await Notifications.setNotificationChannelAsync("medication-expired", {
      name: "Просроченные лекарства",
      description: "Уведомления о просроченных лекарствах",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250, 250, 250],
      lightColor: "#FF0000",
      sound: "default", // Звук ВСЕГДА включен для критических уведомлений о лекарствах
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
    
    // Канал для уведомлений о сроке годности
    await Notifications.setNotificationChannelAsync("medication-expiry", {
      name: "Срок годности лекарств",
      description: "Уведомления о приближающемся сроке годности",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250, 250, 250],
      lightColor: "#FF0000",
      sound: "default", // Звук ВСЕГДА включен для критических уведомлений о лекарствах
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
    
    // Канал для общих уведомлений о лекарствах
    await Notifications.setNotificationChannelAsync("medication-alert", {
      name: "Уведомления о лекарствах",
      description: "Общие уведомления о лекарствах",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250, 250, 250],
      lightColor: "#FF0000",
      sound: "default", // Звук ВСЕГДА включен для критических уведомлений о лекарствах
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
    
    // Канал для уведомлений о запасах
    await Notifications.setNotificationChannelAsync("medication-stock", {
      name: "Запасы лекарств",
      description: "Уведомления о низком запасе лекарств",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250, 250, 250],
      lightColor: "#FF0000",
      sound: "default", // Звук ВСЕГДА включен для критических уведомлений о лекарствах
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
  }
}

// Инициализация канала при загрузке модуля
setupNotificationChannel().catch((err) => {
  console.log("Ошибка настройки канала уведомлений:", err);
});

// Создание повторяющихся уведомлений при срабатывании основного
async function createRepeatNotificationsForToday(reminderId: number) {
  try {
    const { getReminderById } = await import("../database/reminders.service");
    const { loadNotificationSettings } = await import("./notifications");
    
    const reminder = await getReminderById(reminderId);
    if (!reminder || !reminder.isActive) {
      return; // Напоминание не найдено или неактивно
    }

    // Проверяем, не было ли уже принято лекарство сегодня
    const { getMedicationLogForDay } = await import("../database/medication-log.service");
    const today = new Date().toISOString().split('T')[0];
    const logs = await getMedicationLogForDay(reminder.userId, today);
    const alreadyTaken = logs.some((log: any) => log.reminderId === reminderId);
    
    if (alreadyTaken) {
      return; // Лекарство уже принято, не создаем повторяющиеся уведомления
    }

    const notificationSettings = await loadNotificationSettings();
    if (!notificationSettings.repeatEnabled) {
      return; // Повторяющиеся уведомления отключены
    }

    const repeatInterval = notificationSettings.repeatInterval || 5;
    const repeatCount = notificationSettings.repeatCount || 12;

    const now = new Date();
    const repeatNotificationIds: string[] = [];

    // Создаем повторяющиеся уведомления на сегодня
    for (let i = 1; i <= repeatCount; i++) {
      const intervalMinutes = repeatInterval * i;
      let repeatHour = reminder.hour;
      let repeatMinute = reminder.minute + intervalMinutes;

      if (repeatMinute >= 60) {
        repeatHour += Math.floor(repeatMinute / 60);
        repeatMinute = repeatMinute % 60;
      }

      if (repeatHour >= 24) {
        repeatHour = repeatHour % 24;
      }

      const repeatDate = new Date();
      repeatDate.setHours(repeatHour, repeatMinute, 0, 0);

      // Если время уже прошло, пропускаем это уведомление
      if (repeatDate <= now) {
        continue;
      }

      try {
        const repeatNotificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `🔔 ${reminder.title}`,
            body: `${reminder.body || `${reminder.medicineName || "Лекарство"} - пора принять`} (напоминание через ${intervalMinutes} мин)`,
            sound: "default",
            priority: Notifications.AndroidNotificationPriority.MAX,
            data: { 
              medicineId: reminder.medicineId, 
              reminderId: reminderId,
              isRepeat: true,
            },
            categoryIdentifier: "medication-reminder",
            ...(Platform.OS === "android" && {
              vibrate: [0, 250, 250, 250, 250, 250],
              lightColor: "#FF0000",
              sticky: true,
              autoDismiss: false,
              sound: "default",
            }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: repeatDate,
            // БЕЗ repeats - только один раз на сегодня
          },
          identifier: `reminder-repeat-${reminderId}-${Date.now()}-${intervalMinutes}`,
        });

        repeatNotificationIds.push(repeatNotificationId);
      } catch (error) {
        console.error(`Error scheduling repeat notification (${intervalMinutes} min):`, error);
      }
    }

    // Сохраняем идентификаторы повторяющихся уведомлений
    if (repeatNotificationIds.length > 0) {
      const { getDB } = await import("../database/medicine.database");
      const db = await getDB();
      const existing = await db.getFirstAsync<{ repeatNotificationIds: string | null }>(
        `SELECT repeatNotificationIds FROM reminders WHERE id = ?`,
        [reminderId]
      );
      
      const existingIds = existing?.repeatNotificationIds 
        ? JSON.parse(existing.repeatNotificationIds) 
        : [];
      const allIds = [...existingIds, ...repeatNotificationIds];
      
      await db.runAsync(
        `UPDATE reminders SET repeatNotificationIds = ? WHERE id = ?`,
        [JSON.stringify(allIds), reminderId]
      );
      
      console.log(`✅ Создано ${repeatNotificationIds.length} повторяющихся уведомлений на сегодня для reminder ${reminderId}`);
    }
  } catch (error) {
    console.error("Error creating repeat notifications:", error);
  }
}

// Универсальная настройка уведомлений с учетом сохраненных настроек
async function setupNotificationHandler() {
  const settings = await loadNotificationSettings();
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      // Для критических уведомлений о лекарствах всегда показываем, даже при выключенном звуке
      const isMedicationReminder = 
        notification.request.content.categoryIdentifier === "medication-reminder" ||
        notification.request.content.categoryIdentifier === "medication-reminders" ||
        notification.request.content.categoryIdentifier === "medication-alert" ||
        notification.request.content.categoryIdentifier === "medication-expiry" ||
        notification.request.content.categoryIdentifier === "medication-expired" ||
        notification.request.content.categoryIdentifier === "medication-stock";
      
      // Если это основное уведомление о лекарстве (не повторяющееся), создаем повторяющиеся уведомления на сегодня
      if (isMedicationReminder && notification.request.content.data?.reminderId && !notification.request.content.data?.isRepeat) {
        const reminderId = Number(notification.request.content.data.reminderId);
        if (!Number.isFinite(reminderId)) {
          return {
            shouldPlaySound: isMedicationReminder ? true : (settings.soundEnabled && settings.enabled),
            shouldSetBadge: settings.badgeEnabled && settings.enabled,
            shouldShowBanner: settings.enabled || isMedicationReminder,
            shouldShowList: settings.enabled || isMedicationReminder,
          };
        }
        // Создаем повторяющиеся уведомления асинхронно, не блокируя показ уведомления
        createRepeatNotificationsForToday(reminderId).catch((err) => {
          console.error("Error creating repeat notifications:", err);
        });
      }
      
      // Для критических уведомлений о лекарствах ВСЕГДА включаем звук
      // Это критически важно для здоровья пользователя
      return {
        shouldPlaySound: isMedicationReminder ? true : (settings.soundEnabled && settings.enabled), // Звук ВСЕГДА включен для лекарств
        shouldSetBadge: settings.badgeEnabled && settings.enabled,
        shouldShowBanner: settings.enabled || isMedicationReminder, // Всегда показываем для лекарств
        shouldShowList: settings.enabled || isMedicationReminder, // Всегда показываем для лекарств
      };
    },
  });
}

// Инициализация обработчика уведомлений
setupNotificationHandler().catch((err) => {
  console.log("Ошибка настройки обработчика уведомлений:", err);
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
  } catch (e: any) {
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
