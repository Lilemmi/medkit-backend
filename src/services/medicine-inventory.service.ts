// 📌 Сервис для учета количества таблеток и синхронизации с напоминаниями

import { getDB } from "../database/medicine.database";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getAllReminders } from "../database/reminders.service";

// ----------------------------------------------------
// 📉 УМЕНЬШИТЬ КОЛИЧЕСТВО ТАБЛЕТОК ПРИ ПРИЕМЕ
// ----------------------------------------------------
export async function decreasePillsOnIntake(
  medicineId: number,
  pillsToDecrease?: number
): Promise<{ success: boolean; remainingPills: number | null; message?: string }> {
  const db = await getDB();

  try {
    // Получаем информацию о лекарстве
    const medicine = await db.getFirstAsync<{
      totalPills: number | null;
      usedPills: number | null;
      pillsPerDose: number | null;
      name: string | null;
    }>(
      `SELECT totalPills, usedPills, pillsPerDose, name FROM medicines WHERE id = ?`,
      [medicineId]
    );

    if (!medicine) {
      return { success: false, remainingPills: null, message: "Лекарство не найдено" };
    }

    // Если totalPills не установлено, не можем уменьшать
    if (!medicine.totalPills) {
      return { success: false, remainingPills: null, message: "Количество таблеток не установлено" };
    }

    // Определяем количество таблеток для уменьшения
    const pillsPerDose = medicine.pillsPerDose || 1;
    const decreaseAmount = pillsToDecrease || pillsPerDose;

    // Вычисляем новое количество использованных таблеток
    const currentUsed = medicine.usedPills || 0;
    const newUsed = currentUsed + decreaseAmount;

    // Проверяем, не превышает ли использованное количество общее
    if (newUsed > medicine.totalPills) {
      return {
        success: false,
        remainingPills: medicine.totalPills - currentUsed,
        message: "Недостаточно таблеток",
      };
    }

    // Обновляем количество использованных таблеток
    await db.runAsync(
      `UPDATE medicines SET usedPills = ? WHERE id = ?`,
      [newUsed, medicineId]
    );

    const remainingPills = medicine.totalPills - newUsed;

    // Проверяем, нужно ли отправить уведомление о низком количестве
    await checkAndNotifyLowStock(medicineId, remainingPills);

    return {
      success: true,
      remainingPills,
      message: remainingPills <= 0 ? "Таблетки закончились" : undefined,
    };
  } catch (error) {
    console.error("Ошибка уменьшения количества таблеток:", error);
    return { success: false, remainingPills: null, message: "Ошибка обновления количества" };
  }
}

// ----------------------------------------------------
// 📊 РАССЧИТАТЬ ДАТУ ИСЧЕРПАНИЯ ЗАПАСОВ
// ----------------------------------------------------
export async function calculateExhaustionDate(medicineId: number): Promise<Date | null> {
  const db = await getDB();

  try {
    // Получаем информацию о лекарстве
    const medicine = await db.getFirstAsync<{
      totalPills: number | null;
      usedPills: number | null;
      pillsPerDose: number | null;
    }>(
      `SELECT totalPills, usedPills, pillsPerDose FROM medicines WHERE id = ?`,
      [medicineId]
    );

    if (!medicine || !medicine.totalPills) {
      return null;
    }

    const remainingPills = (medicine.totalPills || 0) - (medicine.usedPills || 0);
    const pillsPerDose = medicine.pillsPerDose || 1;

    if (remainingPills <= 0) {
      return new Date(); // Уже закончились
    }

    // Получаем информацию о пользователе из лекарства
    const medicineUser = await db.getFirstAsync<{ userId: number }>(
      `SELECT userId FROM medicines WHERE id = ?`,
      [medicineId]
    );

    if (!medicineUser) {
      return null;
    }

    // Получаем все активные напоминания для этого лекарства
    const reminders = await getAllReminders(medicineUser.userId);
    const medicineReminders = reminders.filter((r: any) => r.medicineId === medicineId && r.isActive);

    if (medicineReminders.length === 0) {
      return null; // Нет напоминаний, невозможно рассчитать
    }

    // Подсчитываем количество приемов в день
    let intakesPerDay = 0;
    for (const reminder of medicineReminders) {
      // Если указаны дни недели, считаем количество дней в неделе
      if (reminder.daysOfWeek && reminder.daysOfWeek.length > 0) {
        intakesPerDay += reminder.daysOfWeek.length / 7; // Среднее количество приемов в день
      } else {
        // Ежедневное напоминание
        intakesPerDay += 1;
      }
    }

    if (intakesPerDay === 0) {
      return null;
    }

    // Рассчитываем количество дней до исчерпания
    const daysUntilExhaustion = Math.ceil(remainingPills / (pillsPerDose * intakesPerDay));

    // Возвращаем дату исчерпания
    const exhaustionDate = new Date();
    exhaustionDate.setDate(exhaustionDate.getDate() + daysUntilExhaustion);

    return exhaustionDate;
  } catch (error) {
    console.error("Ошибка расчета даты исчерпания:", error);
    return null;
  }
}

// ----------------------------------------------------
// 🔔 ПРОВЕРИТЬ И УВЕДОМИТЬ О НИЗКОМ КОЛИЧЕСТВЕ
// ----------------------------------------------------
export async function checkAndNotifyLowStock(
  medicineId: number,
  remainingPills: number
): Promise<void> {
  const db = await getDB();

  try {
    // Получаем информацию о лекарстве
    const medicine = await db.getFirstAsync<{
      name: string | null;
      lowStockThreshold: number | null;
      userId: number | null;
    }>(
      `SELECT name, lowStockThreshold, userId FROM medicines WHERE id = ?`,
      [medicineId]
    );

    if (!medicine) {
      return;
    }

    const threshold = medicine.lowStockThreshold || 10;

    // Проверяем, достигнут ли порог
    if (remainingPills > threshold) {
      return; // Еще достаточно таблеток
    }

    // Рассчитываем дату исчерпания
    const exhaustionDate = await calculateExhaustionDate(medicineId);
    if (!exhaustionDate) {
      return;
    }

    // Проверяем, нужно ли отправить уведомление за 3 дня до исчерпания
    const now = new Date();
    const daysUntilExhaustion = Math.ceil(
      (exhaustionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExhaustion <= 3 && daysUntilExhaustion >= 0) {
      // Отправляем уведомление о необходимости покупки
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "⚠️ Заканчиваются таблетки",
          body: `${medicine.name || "Лекарство"} - осталось ${remainingPills} таблеток. Пора купить!`,
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: { medicineId, type: "low_stock" },
          categoryIdentifier: "medication-stock",
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
  } catch (error) {
    console.error("Ошибка проверки низкого количества:", error);
  }
}

// ----------------------------------------------------
// 🔄 ПРОВЕРИТЬ ВСЕ ЛЕКАРСТВА НА НИЗКОЕ КОЛИЧЕСТВО
// ----------------------------------------------------
export async function checkAllMedicinesForLowStock(userId: number): Promise<void> {
  const db = await getDB();

  try {
    // Получаем все лекарства с установленным количеством таблеток
    const medicines = await db.getAllAsync<{
      id: number;
      totalPills: number | null;
      usedPills: number | null;
    }>(
      `SELECT id, totalPills, usedPills FROM medicines WHERE userId = ? AND totalPills IS NOT NULL`,
      [userId]
    );

    for (const medicine of medicines) {
      const remainingPills =
        (medicine.totalPills || 0) - (medicine.usedPills || 0);
      await checkAndNotifyLowStock(medicine.id, remainingPills);
    }
  } catch (error) {
    console.error("Ошибка проверки всех лекарств:", error);
  }
}

