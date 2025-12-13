import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getDB } from "./medicine.database";
import { cancelRepeatNotificationsForReminder } from "./reminders.service";

// ----------------------------------------------------
// ✅ ОТМЕТИТЬ ЛЕКАРСТВО КАК ПРИНЯТОЕ
// ----------------------------------------------------
export async function markMedicineAsTaken({
  medicineId,
  medicineName,
  reminderId,
  userId,
  scheduledTime,
  dose,
  notes,
  pillsTaken = 1, // Количество таблеток, принятых за раз (по умолчанию 1)
}: {
  medicineId?: number;
  medicineName: string;
  reminderId?: number;
  userId: number;
  scheduledTime?: string;
  dose?: string;
  notes?: string;
  pillsTaken?: number; // Количество таблеток, принятых за раз
}) {
  const db = await getDB();

  // Отменяем повторяющиеся уведомления для этого напоминания, если оно было подтверждено
  if (reminderId) {
    try {
      await cancelRepeatNotificationsForReminder(reminderId);
    } catch (error) {
      console.error("Error canceling repeat notifications:", error);
      // Не прерываем выполнение, если не удалось отменить уведомления
    }
  }

  // Записываем в журнал приема
  // takenAt устанавливается автоматически как datetime('now') - реальное время нажатия кнопки
  const result = await db.runAsync(
    `
      INSERT INTO medication_log (medicineId, medicineName, reminderId, userId, scheduledTime, dose, notes, pillsTaken, takenAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `,
    [medicineId || null, medicineName, reminderId || null, userId, scheduledTime || null, dose || null, notes || null, pillsTaken]
  );

  // Уменьшаем количество таблеток, если указан medicineId и есть информация о количестве
  if (medicineId) {
    try {
      const medicine = await db.getFirstAsync<{
        totalPills: number | null;
        usedPills: number | null;
        pillsPerDose: number | null;
        lowStockThreshold: number | null;
      }>(
        `SELECT totalPills, usedPills, pillsPerDose, lowStockThreshold FROM medicines WHERE id = ? AND userId = ?`,
        [medicineId, userId]
      );

      if (medicine && medicine.totalPills != null) {
        // Используем переданное количество или количество на один прием
        const pillsToDecrease = pillsTaken || medicine.pillsPerDose || 1;
        
        // Обновляем количество использованных таблеток
        const newUsedPills = (medicine.usedPills || 0) + pillsToDecrease;
        const remainingPills = (medicine.totalPills ?? 0) - newUsedPills;

        await db.runAsync(
          `UPDATE medicines SET usedPills = ? WHERE id = ? AND userId = ?`,
          [newUsedPills, medicineId, userId]
        );

        // Проверяем, нужно ли отправить уведомление о низком количестве
        const threshold = medicine.lowStockThreshold || 10;
        if (remainingPills <= threshold && remainingPills > 0) {
          await checkAndNotifyLowStock(medicineId, medicineName, remainingPills, threshold, userId);
        }

        // Проверяем, нужно ли отправить уведомление за 3 дня до исчерпания
        await checkExhaustionDateAndNotify(medicineId, medicineName, remainingPills, pillsToDecrease, userId);
      }
    } catch (error) {
      console.error("Error updating pill count:", error);
      // Не прерываем выполнение, если не удалось обновить количество
    }
  }

  return result.lastInsertRowId ?? 0;
}

// ----------------------------------------------------
// 🔔 ПРОВЕРИТЬ И УВЕДОМИТЬ О НИЗКОМ КОЛИЧЕСТВЕ ТАБЛЕТОК
// ----------------------------------------------------
async function checkAndNotifyLowStock(
  medicineId: number,
  medicineName: string,
  remainingPills: number,
  threshold: number,
  userId: number
) {
  const db = await getDB();

  // Проверяем, не было ли уже отправлено уведомление для этого лекарства
  // Используем reasonType для типа уведомления и isResolved для статуса
  const existingNotification = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM refill_notifications WHERE medicineId = ? AND userId = ? AND isResolved = 0 AND reasonType = 'low_stock'`,
    [medicineId, userId]
  );

  if (existingNotification) {
    // Уведомление уже существует, обновляем его
    await db.runAsync(
      `UPDATE refill_notifications SET reason = ?, createdAt = datetime('now') WHERE id = ?`,
      [
        `Осталось мало таблеток: ${medicineName}. Осталось ${remainingPills} ${getPillWord(remainingPills)}. Рекомендуется купить новую упаковку.`,
        existingNotification.id,
      ]
    );
    return;
  }

  // Создаем новое уведомление
  await db.runAsync(
    `
      INSERT INTO refill_notifications (medicineId, medicineName, userId, reason, reasonType, isResolved)
      VALUES (?, ?, ?, ?, 'low_stock', 0)
    `,
    [
      medicineId,
      medicineName,
      userId,
      `Осталось мало таблеток: ${medicineName}. Осталось ${remainingPills} ${getPillWord(remainingPills)}. Рекомендуется купить новую упаковку.`,
    ]
  );

  // Отправляем push-уведомление
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⚠️ Осталось мало таблеток",
        body: `${medicineName}: осталось ${remainingPills} ${getPillWord(remainingPills)}. Рекомендуется купить новую упаковку.`,
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: { medicineId, type: "low_stock" },
        // Android-специфичные настройки для работы при выключенном звуке
        ...(Platform.OS === "android" && {
          vibrate: [0, 250, 250, 250, 250, 250],
          lightColor: "#FF0000",
          sticky: true,
          autoDismiss: false,
        }),
      },
      trigger: ({ seconds: 0 } as any),
    });
  } catch (error) {
    console.error("Error sending low stock notification:", error);
  }
}

// ----------------------------------------------------
// 📅 ПРОВЕРИТЬ ДАТУ ИСЧЕРПАНИЯ И УВЕДОМИТЬ ЗА 3 ДНЯ
// ----------------------------------------------------
async function checkExhaustionDateAndNotify(
  medicineId: number,
  medicineName: string,
  remainingPills: number,
  pillsPerDose: number,
  userId: number
) {
  try {
    const { calculateExhaustionDate } = await import("../services/medicine-inventory.service");
    const exhaustionDate = await calculateExhaustionDate(medicineId);

    if (!exhaustionDate) {
      return; // Невозможно рассчитать дату
    }

    const now = new Date();
    const daysUntilExhaustion = Math.ceil(
      (exhaustionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Проверяем, нужно ли отправить уведомление за 3 дня до исчерпания
    if (daysUntilExhaustion <= 3 && daysUntilExhaustion >= 0) {
      const db = await getDB();
      
      // Проверяем, не было ли уже отправлено уведомление
      const existingNotification = await db.getFirstAsync<{ id: number }>(
        `SELECT id FROM refill_notifications WHERE medicineId = ? AND userId = ? AND isResolved = 0 AND reasonType = 'low_stock' AND reason LIKE '%закончатся через%'`,
        [medicineId, userId]
      );

      if (existingNotification) {
        // Обновляем существующее уведомление
        await db.runAsync(
          `UPDATE refill_notifications SET reason = ?, createdAt = datetime('now') WHERE id = ?`,
          [
            `Таблетки "${medicineName}" закончатся через ${daysUntilExhaustion} ${getDayWord(daysUntilExhaustion)}. Осталось ${remainingPills} ${getPillWord(remainingPills)}. Пора купить!`,
            existingNotification.id,
          ]
        );
      } else {
        // Создаем новое уведомление
        await db.runAsync(
          `
            INSERT INTO refill_notifications (medicineId, medicineName, userId, reason, reasonType, isResolved)
            VALUES (?, ?, ?, ?, 'low_stock', 0)
          `,
          [
            medicineId,
            medicineName,
            userId,
            `Таблетки "${medicineName}" закончатся через ${daysUntilExhaustion} ${getDayWord(daysUntilExhaustion)}. Осталось ${remainingPills} ${getPillWord(remainingPills)}. Пора купить!`,
          ]
        );

        // Отправляем push-уведомление
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "⚠️ Заканчиваются таблетки",
            body: `${medicineName} - осталось ${remainingPills} ${getPillWord(remainingPills)}. Закончатся через ${daysUntilExhaustion} ${getDayWord(daysUntilExhaustion)}. Пора купить!`,
            sound: "default",
            priority: Notifications.AndroidNotificationPriority.MAX,
            data: { medicineId, type: "low_stock" },
            // Android-специфичные настройки для работы при выключенном звуке
            ...(Platform.OS === "android" && {
              vibrate: [0, 250, 250, 250, 250, 250],
              lightColor: "#FF0000",
              sticky: true,
              autoDismiss: false,
            }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(Date.now() + 1000),
          },
        });
      }
    }
  } catch (error) {
    console.error("Error checking exhaustion date:", error);
  }
}

function getDayWord(days: number): string {
  if (days === 1) return "день";
  if (days >= 2 && days <= 4) return "дня";
  return "дней";
}

// ----------------------------------------------------
// 🔍 ПРОВЕРИТЬ ВСЕ ЛЕКАРСТВА НА НИЗКОЕ КОЛИЧЕСТВО
// ----------------------------------------------------
export async function checkAllMedicinesForLowStock(userId: number) {
  const db = await getDB();

  const medicines = await db.getAllAsync<import("../types/db").MedicineRow>(
    `SELECT id, name, totalPills, usedPills, lowStockThreshold FROM medicines WHERE userId = ? AND totalPills IS NOT NULL`,
    [userId]
  );

  for (const medicine of medicines) {
    if (medicine.totalPills != null) {
      const totalPills = medicine.totalPills ?? 0;
      const remainingPills = totalPills - (medicine.usedPills || 0);
      const threshold = medicine.lowStockThreshold || 10;

      if (remainingPills <= threshold && remainingPills > 0) {
        await checkAndNotifyLowStock(
          medicine.id,
          medicine.name || "Лекарство",
          remainingPills,
          threshold,
          userId
        );
      }
    }
  }
}

// ----------------------------------------------------
// 📝 ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ СКЛОНЕНИЯ СЛОВА "ТАБЛЕТКА"
// ----------------------------------------------------
function getPillWord(count: number): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return "таблеток";
  }

  if (lastDigit === 1) {
    return "таблетка";
  } else if (lastDigit >= 2 && lastDigit <= 4) {
    return "таблетки";
  } else {
    return "таблеток";
  }
}

// ----------------------------------------------------
// 📋 ПОЛУЧИТЬ ЖУРНАЛ ПРИЕМА ЗА ДЕНЬ
// ----------------------------------------------------
export async function getMedicationLogForDay(userId: number, date: string) {
  const db = await getDB();

  const logs = await db.getAllAsync<import("../types/db").MedicationLogRow>(
    `
      SELECT * FROM medication_log
      WHERE userId = ? AND DATE(takenAt) = DATE(?)
      ORDER BY takenAt DESC
    `,
    [userId, date]
  );

  return logs;
}

// ----------------------------------------------------
// 📋 ПОЛУЧИТЬ РАСПИСАНИЕ ПРИЕМА НА ДЕНЬ
// ----------------------------------------------------
export async function getDailySchedule(userId: number, date: string) {
  const db = await getDB();

  // Получаем день недели (0 = воскресенье, 1 = понедельник, ...)
  const dayOfWeek = new Date(date).getDay();

  // Получаем все активные напоминания
  const reminders = await db.getAllAsync<import("../types/db").Reminder>(
    `
      SELECT * FROM reminders
      WHERE userId = ? AND isActive = 1
      ORDER BY hour, minute ASC
    `,
    [userId]
  );

  // Фильтруем напоминания по дню недели
  const todayReminders = reminders.filter((r: any) => {
    if (!r.daysOfWeek) {
      // Если дни недели не указаны, показываем каждый день
      return true;
    }
    try {
      const days = JSON.parse(r.daysOfWeek);
      return days.includes(dayOfWeek);
    } catch {
      return true;
    }
  });

  // Получаем журнал приема за этот день
  const logs = await getMedicationLogForDay(userId, date);

  // Создаем расписание с информацией о принятии
  const schedule = todayReminders.map((reminder: any) => {
    const scheduledTime = `${String(reminder.hour).padStart(2, "0")}:${String(reminder.minute).padStart(2, "0")}`;
    
    // Проверяем, было ли лекарство принято в это время
    const taken = logs.some((log: any) => {
      if (log.reminderId === reminder.id) {
        return true;
      }
      // Также проверяем по названию и времени
      if (log.medicineName === reminder.medicineName && log.scheduledTime === scheduledTime) {
        return true;
      }
      return false;
    });

    // Находим соответствующий лог приема
    const matchingLog = logs.find((log: any) => 
      log.reminderId === reminder.id || 
      (log.medicineName === reminder.medicineName && log.scheduledTime === scheduledTime)
    );

    return {
      ...reminder,
      scheduledTime,
      taken,
      // Используем реальное время приема из лога (takenAt), а не запланированное время
      takenAt: taken && matchingLog ? matchingLog.takenAt : null,
    };
  });

  return schedule;
}

// ----------------------------------------------------
// 📊 ПОЛУЧИТЬ СТАТИСТИКУ ПРИЕМА
// ----------------------------------------------------
export async function getMedicationStats(userId: number, startDate: string, endDate: string) {
  const db = await getDB();

  const stats = await db.getFirstAsync<{ totalTaken: number; daysWithMedication: number; uniqueMedicines: number; }>(
    `
      SELECT 
        COUNT(*) as totalTaken,
        COUNT(DISTINCT DATE(takenAt)) as daysWithMedication,
        COUNT(DISTINCT medicineName) as uniqueMedicines
      FROM medication_log
      WHERE userId = ? AND DATE(takenAt) BETWEEN DATE(?) AND DATE(?)
    `,
    [userId, startDate, endDate]
  );

  return stats;
}

