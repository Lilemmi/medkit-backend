import * as Notifications from "expo-notifications";
import { getAllRefillNotifications } from "../database/refill.service";

// ----------------------------------------------------
// 🔔 СОЗДАТЬ ПЕРИОДИЧЕСКОЕ НАПОМИНАНИЕ О ПОПОЛНЕНИИ
// ----------------------------------------------------
export async function scheduleRefillReminders(userId: number) {
  try {
    // Получаем все активные уведомления о пополнении
    const notifications = await getAllRefillNotifications(userId);

    if (notifications.length === 0) {
      // Если нет уведомлений, отменяем все существующие напоминания
      await cancelAllRefillReminders();
      return;
    }

    // Отменяем старые напоминания
    await cancelAllRefillReminders();

    // Создаем новое периодическое напоминание каждые 4 часа
    // Вычисляем дату и время первого срабатывания (8:00)
    const now = new Date();
    const targetDate = new Date();
    targetDate.setHours(8, 0, 0, 0);
    
    // Если время уже прошло сегодня, планируем на завтра
    if (targetDate <= now) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🛒 Пополнение аптечки",
        body: `У вас ${notifications.length} ${notifications.length === 1 ? "лекарство" : notifications.length < 5 ? "лекарства" : "лекарств"} требует пополнения`,
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: "refill_reminder", userId },
        categoryIdentifier: "refill-reminder",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: targetDate,
        repeats: true, // Повторяем каждый день
      } as any,
      identifier: `refill-reminder-${userId}`,
    });

    // Создаем дополнительные напоминания каждые 4 часа (12:00, 16:00, 20:00)
    const additionalHours = [12, 16, 20];
    
    for (const hour of additionalHours) {
      // Вычисляем дату и время для каждого дополнительного напоминания
      const additionalDate = new Date();
      additionalDate.setHours(hour, 0, 0, 0);
      
      // Если время уже прошло сегодня, планируем на завтра
      if (additionalDate <= now) {
        additionalDate.setDate(additionalDate.getDate() + 1);
      }
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🛒 Пополнение аптечки",
          body: `У вас ${notifications.length} ${notifications.length === 1 ? "лекарство" : notifications.length < 5 ? "лекарства" : "лекарств"} требует пополнения`,
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { type: "refill_reminder", userId },
          categoryIdentifier: "refill-reminder",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: additionalDate,
          repeats: true, // Повторяем каждый день
        } as any,
        identifier: `refill-reminder-${userId}-${hour}`,
      });
    }

    console.log("✅ Периодические напоминания о пополнении созданы");
  } catch (error) {
    console.error("❌ Ошибка создания периодических напоминаний:", error);
  }
}

// ----------------------------------------------------
// 🗑️ ОТМЕНИТЬ ВСЕ НАПОМИНАНИЯ О ПОПОЛНЕНИИ
// ----------------------------------------------------
export async function cancelAllRefillReminders() {
  try {
    // Получаем все запланированные уведомления
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    // Отменяем все напоминания о пополнении
    for (const notification of scheduledNotifications) {
      if (notification.identifier.startsWith("refill-reminder-")) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }

    console.log("✅ Все напоминания о пополнении отменены");
  } catch (error) {
    console.error("❌ Ошибка отмены напоминаний:", error);
  }
}

// ----------------------------------------------------
// 🔄 ОБНОВИТЬ НАПОМИНАНИЯ О ПОПОЛНЕНИИ
// ----------------------------------------------------
export async function updateRefillReminders(userId: number) {
  await scheduleRefillReminders(userId);
}






