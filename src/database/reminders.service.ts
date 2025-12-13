import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getDB } from "./medicine.database";

// ----------------------------------------------------
// 🔔 СОЗДАТЬ НАПОМИНАНИЕ
// ----------------------------------------------------
export async function createReminder({
  medicineId,
  medicineName,
  title,
  body,
  hour,
  minute,
  daysOfWeek,
  userId,
  recipientType = "user", // "user" или "family"
  recipientId, // userId или familyMemberId
}: {
  medicineId?: number;
  medicineName?: string;
  title: string;
  body?: string;
  hour: number;
  minute: number;
  daysOfWeek?: number[]; // [0-6] где 0 = воскресенье
  userId: number; // ID пользователя, создающего напоминание
  recipientType?: "user" | "family"; // Тип получателя
  recipientId?: number; // ID получателя (userId или familyMemberId)
}) {
  const db = await getDB();

  // Убеждаемся, что все необходимые колонки существуют
  try {
    const tableInfo = await db.getAllAsync<any>(`PRAGMA table_info(reminders);`);
    const hasRecipientType = tableInfo.some((c: any) => c.name === "recipientType");
    const hasRecipientId = tableInfo.some((c: any) => c.name === "recipientId");
    
    if (!hasRecipientType) {
      await db.execAsync(`ALTER TABLE reminders ADD COLUMN recipientType TEXT DEFAULT 'user';`);
    }
    if (!hasRecipientId) {
      await db.execAsync(`ALTER TABLE reminders ADD COLUMN recipientId INTEGER;`);
    }
  } catch (error: any) {
    // Игнорируем ошибки, если колонки уже существуют
    if (!error?.message?.includes("duplicate column") && !error?.message?.includes("already exists")) {
      console.error("⚠️ Ошибка проверки колонок reminders:", error);
    }
  }
  
  // Определяем recipientId: если recipientType === "user", используем userId, иначе используем переданный recipientId
  const finalRecipientId = recipientType === "user" ? userId : (recipientId || userId);

  // Планируем основное уведомление и повторяющиеся уведомления
  let notificationId: string | null = null;
  const repeatNotificationIds: string[] = [];

  // Сначала сохраняем в БД, чтобы получить reminderId и положить его в data уведомления
  const result = await db.runAsync(
    `
      INSERT INTO reminders (medicineId, medicineName, title, body, hour, minute, daysOfWeek, notificationId, userId, recipientType, recipientId, repeatNotificationIds, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `,
    [
      medicineId || null,
      medicineName || null,
      title,
      body || null,
      hour,
      minute,
      daysOfWeek ? JSON.stringify(daysOfWeek) : null,
      null,
      userId,
      recipientType,
      finalRecipientId,
      repeatNotificationIds.length > 0 ? JSON.stringify(repeatNotificationIds) : null,
    ]
  );

  const reminderId = result.lastInsertRowId ?? 0;

  // Планируем основное уведомление уже с reminderId в data
  try {
    const now = new Date();
    const targetDate = new Date();
    targetDate.setHours(hour, minute, 0, 0);

    // Если время уже прошло сегодня, планируем на завтра
    if (targetDate <= now) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    const mainTrigger: any = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: targetDate,
      repeats: true, // Повторяем каждый день
    };

    const notificationContent = {
      title,
      body: body || `${medicineName || "Лекарство"} - пора принять`,
      sound: "default", // ЗВУК ВСЕГДА ВКЛЮЧЕН для уведомлений о лекарствах
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: { medicineId: medicineId || null, reminderId },
      categoryIdentifier: "medication-reminder",
      ...(Platform.OS === "android" && {
        vibrate: [0, 250, 250, 250, 250, 250],
        lightColor: "#FF0000",
        sticky: true,
        autoDismiss: false,
        sound: "default",
      }),
    };

    notificationId = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: mainTrigger,
      identifier: `reminder-main-${reminderId}`,
    });

    console.log(
      `✅ Создано основное уведомление. Повторяющиеся уведомления будут созданы автоматически при срабатывании.`
    );
  } catch (error) {
    console.error("Error scheduling notification:", error);
  }

  // Сохраняем notificationId, если удалось запланировать
  if (notificationId && reminderId) {
    try {
      await db.runAsync(`UPDATE reminders SET notificationId = ? WHERE id = ?`, [
        notificationId,
        reminderId,
      ]);
    } catch (error) {
      console.error("Error updating notificationId:", error);
    }
  }

  return reminderId;
}

// ----------------------------------------------------
// 📌 ПОЛУЧИТЬ ВСЕ НАПОМИНАНИЯ ПОЛЬЗОВАТЕЛЯ
// ----------------------------------------------------
export async function getAllReminders(userId: number) {
  const db = await getDB();

  const reminders = await db.getAllAsync<import("../types/db").Reminder>(
    `
      SELECT * FROM reminders
      WHERE userId = ?
      ORDER BY hour, minute ASC
    `,
    [userId]
  );

  return reminders.map((r: any) => ({
    ...r,
    daysOfWeek: r.daysOfWeek ? JSON.parse(r.daysOfWeek) : null,
    isActive: r.isActive === 1,
  }));
}

// ----------------------------------------------------
// ✏️ ОБНОВИТЬ НАПОМИНАНИЕ
// ----------------------------------------------------
export async function updateReminder({
  id,
  medicineId,
  medicineName,
  title,
  body,
  hour,
  minute,
  daysOfWeek,
  recipientType = "user",
  recipientId,
}: {
  id: number;
  medicineId?: number;
  medicineName?: string;
  title: string;
  body?: string;
  hour: number;
  minute: number;
  daysOfWeek?: number[];
  recipientType?: "user" | "family";
  recipientId?: number;
}) {
  const db = await getDB();

  // Получаем текущие данные напоминания
  const currentReminder = await db.getFirstAsync<{
    userId: number;
    notificationId: string;
    repeatNotificationIds: string | null;
  }>(`SELECT userId, notificationId, repeatNotificationIds FROM reminders WHERE id = ?`, [id]);

  if (!currentReminder) {
    throw new Error("Напоминание не найдено");
  }

  const userId = currentReminder.userId;
  const finalRecipientId = recipientType === "user" ? userId : (recipientId || userId);

  // Отменяем старые уведомления
  if (currentReminder.notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(currentReminder.notificationId);
    } catch (error) {
      console.error("Error canceling main notification:", error);
    }
  }

  // Отменяем все повторяющиеся уведомления
  if (currentReminder.repeatNotificationIds) {
    try {
      const repeatIds = JSON.parse(currentReminder.repeatNotificationIds);
      if (Array.isArray(repeatIds)) {
        for (const repeatId of repeatIds) {
          try {
            await Notifications.cancelScheduledNotificationAsync(repeatId);
          } catch (error) {
            console.error(`Error canceling repeat notification ${repeatId}:`, error);
          }
        }
      }
    } catch (error) {
      console.error("Error parsing repeatNotificationIds:", error);
    }
  }

  // Планируем новые уведомления (аналогично createReminder)
  let notificationId: string | null = null;
  const repeatNotificationIds: string[] = [];

  try {
    // Основное уведомление
    const now = new Date();
    const targetDate = new Date();
    targetDate.setHours(hour, minute, 0, 0);

    if (targetDate <= now) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    const mainTrigger: any = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: targetDate,
      repeats: true,
    };

    const notificationContent = {
      title,
      body: body || `${medicineName || "Лекарство"} - пора принять`,
      sound: "default",
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: { medicineId: medicineId || null, reminderId: id },
      categoryIdentifier: "medication-reminder",
      ...(Platform.OS === "android" && {
        vibrate: [0, 250, 250, 250, 250, 250],
        lightColor: "#FF0000",
        sticky: true,
        autoDismiss: false,
        sound: "default",
      }),
    };

    notificationId = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: mainTrigger,
      identifier: `reminder-main-${id}-${Date.now()}`,
    });

    // ПОВТОРЯЮЩИЕСЯ УВЕДОМЛЕНИЯ БУДУТ СОЗДАНЫ АВТОМАТИЧЕСКИ
    // при срабатывании основного уведомления через обработчик в notifications.ts
    console.log(`✅ Обновлено основное уведомление. Повторяющиеся уведомления будут созданы автоматически при срабатывании.`);
  } catch (error) {
    console.error("Error scheduling notification:", error);
  }

  // Обновляем в БД
  await db.runAsync(
    `
      UPDATE reminders 
      SET medicineId = ?, medicineName = ?, title = ?, body = ?, hour = ?, minute = ?, 
          daysOfWeek = ?, notificationId = ?, recipientType = ?, recipientId = ?, 
          repeatNotificationIds = ?
      WHERE id = ?
    `,
    [
      medicineId || null,
      medicineName || null,
      title,
      body || null,
      hour,
      minute,
      daysOfWeek ? JSON.stringify(daysOfWeek) : null,
      notificationId,
      recipientType,
      finalRecipientId,
      null, // Повторяющиеся уведомления создаются автоматически при срабатывании основного
      id,
    ]
  );

  return id;
}

// ----------------------------------------------------
// 📌 ПОЛУЧИТЬ НАПОМИНАНИЕ ПО ID
// ----------------------------------------------------
export async function getReminderById(id: number) {
  const db = await getDB();

  const reminder = await db.getFirstAsync<any>(
    `SELECT * FROM reminders WHERE id = ?`,
    [id]
  );

  if (!reminder) {
    return null;
  }

  return {
    ...reminder,
    daysOfWeek: reminder.daysOfWeek ? JSON.parse(reminder.daysOfWeek) : null,
    isActive: reminder.isActive === 1,
  };
}

// ----------------------------------------------------
// 🗑️ УДАЛИТЬ НАПОМИНАНИЕ
// ----------------------------------------------------
export async function deleteReminder(id: number) {
  const db = await getDB();

  // Получаем notificationId и repeatNotificationIds перед удалением
  const reminder = await db.getFirstAsync<{ notificationId: string; repeatNotificationIds: string | null }>(
    `SELECT notificationId, repeatNotificationIds FROM reminders WHERE id = ?`,
    [id]
  );

  // Отменяем основное уведомление
  if (reminder?.notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
    } catch (error) {
      console.error("Error canceling main notification:", error);
    }
  }

  // Отменяем все повторяющиеся уведомления
  if (reminder?.repeatNotificationIds) {
    try {
      const repeatIds = JSON.parse(reminder.repeatNotificationIds);
      if (Array.isArray(repeatIds)) {
        for (const repeatId of repeatIds) {
          try {
            await Notifications.cancelScheduledNotificationAsync(repeatId);
          } catch (error) {
            console.error(`Error canceling repeat notification ${repeatId}:`, error);
          }
        }
        console.log(`✅ Отменено ${repeatIds.length} повторяющихся уведомлений`);
      }
    } catch (error) {
      console.error("Error parsing repeatNotificationIds:", error);
    }
  }

  // Удаляем из БД
  await db.runAsync(`DELETE FROM reminders WHERE id = ?`, [id]);
}

// ----------------------------------------------------
// ✅ ОТМЕНИТЬ ПОВТОРЯЮЩИЕСЯ УВЕДОМЛЕНИЯ ПРИ ПОДТВЕРЖДЕНИИ ПРИЕМА
// ----------------------------------------------------
export async function cancelRepeatNotificationsForReminder(reminderId: number) {
  const db = await getDB();

  try {
    const reminder = await db.getFirstAsync<{ repeatNotificationIds: string | null }>(
      `SELECT repeatNotificationIds FROM reminders WHERE id = ?`,
      [reminderId]
    );

    if (reminder?.repeatNotificationIds) {
      const repeatIds = JSON.parse(reminder.repeatNotificationIds);
      if (Array.isArray(repeatIds)) {
        for (const repeatId of repeatIds) {
          try {
            await Notifications.cancelScheduledNotificationAsync(repeatId);
          } catch (error) {
            console.error(`Error canceling repeat notification ${repeatId}:`, error);
          }
        }
        // Очищаем список повторяющихся уведомлений
        await db.runAsync(
          `UPDATE reminders SET repeatNotificationIds = NULL WHERE id = ?`,
          [reminderId]
        );
        console.log(`✅ Отменено ${repeatIds.length} повторяющихся уведомлений для reminder ${reminderId}`);
      }
    }
  } catch (error) {
    console.error("Error canceling repeat notifications:", error);
  }
}

// ----------------------------------------------------
// ✅ ПЕРЕКЛЮЧИТЬ АКТИВНОСТЬ НАПОМИНАНИЯ
// ----------------------------------------------------
export async function toggleReminder(id: number, isActive: boolean) {
  const db = await getDB();

  const reminder = await db.getFirstAsync<{ notificationId: string }>(
    `SELECT notificationId FROM reminders WHERE id = ?`,
    [id]
  );

  if (reminder?.notificationId) {
    if (isActive) {
      // Восстанавливаем уведомление
      const reminderData = await db.getFirstAsync<{
        title: string;
        body: string;
        hour: number;
        minute: number;
        medicineId: number;
      }>(`SELECT title, body, hour, minute, medicineId FROM reminders WHERE id = ?`, [id]);

      if (reminderData) {
        try {
          // Восстанавливаем основное уведомление и повторяющиеся
          const notificationContent = {
            title: reminderData.title,
            body: reminderData.body || "Пора принять лекарство",
            sound: "default", // ЗВУК ВСЕГДА ВКЛЮЧЕН для уведомлений о лекарствах (независимо от настроек)
            priority: Notifications.AndroidNotificationPriority.MAX, // Максимальный приоритет
            data: { medicineId: reminderData.medicineId, reminderId: id },
            categoryIdentifier: "medication-reminder", // Категория для группировки
            // Android-специфичные настройки для работы при выключенном звуке
            ...(Platform.OS === "android" && {
              vibrate: [0, 250, 250, 250, 250, 250], // Вибрация всегда работает
              lightColor: "#FF0000", // Красный свет для важности
              sticky: true, // Уведомление не исчезает автоматически
              autoDismiss: false, // Не скрывается автоматически
              // Принудительно включаем звук даже при выключенном системном звуке
              sound: "default", // Явно указываем звук в Android-настройках
            }),
          };

          // Основное уведомление
          // Вычисляем дату и время первого срабатывания
          const now = new Date();
          const targetDate = new Date();
          targetDate.setHours(reminderData.hour, reminderData.minute, 0, 0);
          
          // Если время уже прошло сегодня, планируем на завтра
          if (targetDate <= now) {
            targetDate.setDate(targetDate.getDate() + 1);
          }
          
          await Notifications.scheduleNotificationAsync({
            identifier: reminder.notificationId,
            content: notificationContent,
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: targetDate,
              repeats: true,
            } as any,
          });

          // ПОВТОРЯЮЩИЕСЯ УВЕДОМЛЕНИЯ БУДУТ СОЗДАНЫ АВТОМАТИЧЕСКИ
          // при срабатывании основного уведомления через обработчик в notifications.ts
          console.log(`✅ Восстановлено основное уведомление. Повторяющиеся уведомления будут созданы автоматически при срабатывании.`);
        } catch (error) {
          console.error("Error rescheduling notification:", error);
        }
      }
    } else {
      // Отменяем уведомление
      try {
        await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
      } catch (error) {
        console.error("Error canceling notification:", error);
      }
    }
  }

  // Обновляем isActive (без updatedAt, чтобы избежать ошибок)
  await db.runAsync(
    `UPDATE reminders SET isActive = ? WHERE id = ?`,
    [isActive ? 1 : 0, id]
  );
}

