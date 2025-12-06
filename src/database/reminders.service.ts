import * as Notifications from "expo-notifications";
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
}: {
  medicineId?: number;
  medicineName?: string;
  title: string;
  body?: string;
  hour: number;
  minute: number;
  daysOfWeek?: number[]; // [0-6] где 0 = воскресенье
  userId: number;
}) {
  const db = await getDB();

  // Планируем уведомление
  let notificationId: string | null = null;
  
  try {
    const trigger: any = {
      hour,
      minute,
      repeats: true,
    };

    // Если указаны дни недели, создаем отдельные уведомления для каждого дня
    // Или используем ежедневное напоминание
    const notification = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: body || `${medicineName || "Лекарство"} - пора принять`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { medicineId: medicineId || null, reminderId: null }, // будет обновлено после сохранения
      },
      trigger,
    });

    notificationId = notification;
  } catch (error) {
    console.error("Error scheduling notification:", error);
  }

  // Сохраняем в БД
  const result = await db.runAsync(
    `
      INSERT INTO reminders (medicineId, medicineName, title, body, hour, minute, daysOfWeek, notificationId, userId, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
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
      userId,
    ]
  );

  const reminderId = result.lastInsertRowId;

  // Обновляем notificationId в БД
  if (notificationId && reminderId) {
    try {
      await db.runAsync(
        `UPDATE reminders SET notificationId = ? WHERE id = ?`,
        [notificationId, reminderId]
      );
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

  const reminders = await db.getAllAsync(
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
// 🗑️ УДАЛИТЬ НАПОМИНАНИЕ
// ----------------------------------------------------
export async function deleteReminder(id: number) {
  const db = await getDB();

  // Получаем notificationId перед удалением
  const reminder = await db.getFirstAsync<{ notificationId: string }>(
    `SELECT notificationId FROM reminders WHERE id = ?`,
    [id]
  );

  // Отменяем уведомление
  if (reminder?.notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
    } catch (error) {
      console.error("Error canceling notification:", error);
    }
  }

  // Удаляем из БД
  await db.runAsync(`DELETE FROM reminders WHERE id = ?`, [id]);
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
          await Notifications.scheduleNotificationAsync({
            identifier: reminder.notificationId,
            content: {
              title: reminderData.title,
              body: reminderData.body || "Пора принять лекарство",
              sound: true,
              priority: Notifications.AndroidNotificationPriority.HIGH,
              data: { medicineId: reminderData.medicineId, reminderId: id },
            },
            trigger: {
              hour: reminderData.hour,
              minute: reminderData.minute,
              repeats: true,
            },
          });
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

  await db.runAsync(
    `UPDATE reminders SET isActive = ? WHERE id = ?`,
    [isActive ? 1 : 0, id]
  );
}

