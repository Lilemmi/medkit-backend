import { getDB } from "./medicine.database";
import { getHealthDB } from "./health.database";
import * as Notifications from "expo-notifications";

/**
 * Полная очистка базы данных лекарств
 * Удаляет все данные из всех таблиц, связанных с лекарствами
 */
export async function clearAllMedicineData(userId?: number): Promise<void> {
  const db = await getDB();
  
  try {
    console.log("🧹 Начало очистки базы данных лекарств...");
    
    if (userId) {
      // Очищаем данные только для конкретного пользователя
      await db.execAsync(`
        DELETE FROM medicines WHERE userId = ?;
        DELETE FROM medication_log WHERE userId = ?;
        DELETE FROM reminders WHERE userId = ?;
        DELETE FROM refill_notifications WHERE userId = ?;
        DELETE FROM deleted_medicines WHERE userId = ?;
      `);
      console.log(`✅ База данных очищена для пользователя ${userId}`);
    } else {
      // Очищаем все данные
      await db.execAsync(`
        DELETE FROM medicines;
        DELETE FROM medication_log;
        DELETE FROM reminders;
        DELETE FROM refill_notifications;
        DELETE FROM deleted_medicines;
      `);
      console.log("✅ Вся база данных лекарств очищена");
    }
    
    // Отменяем все запланированные уведомления
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("✅ Все запланированные уведомления отменены");
    
  } catch (error) {
    console.error("❌ Ошибка при очистке базы данных:", error);
    throw error;
  }
}

/**
 * Очистка базы данных здоровья
 */
export async function clearAllHealthData(userId?: number): Promise<void> {
  const healthDb = await getHealthDB();
  
  try {
    console.log("🧹 Начало очистки базы данных здоровья...");
    
    if (userId) {
      await healthDb.execAsync(`
        DELETE FROM health_metrics WHERE userId = ?;
        DELETE FROM symptoms WHERE userId = ?;
        DELETE FROM mood WHERE userId = ?;
        DELETE FROM activities WHERE userId = ?;
        DELETE FROM sleep WHERE userId = ?;
        DELETE FROM water WHERE userId = ?;
        DELETE FROM doctor_visits WHERE userId = ?;
        DELETE FROM lab_results WHERE userId = ?;
      `);
      console.log(`✅ База данных здоровья очищена для пользователя ${userId}`);
    } else {
      await healthDb.execAsync(`
        DELETE FROM health_metrics;
        DELETE FROM symptoms;
        DELETE FROM mood;
        DELETE FROM activities;
        DELETE FROM sleep;
        DELETE FROM water;
        DELETE FROM doctor_visits;
        DELETE FROM lab_results;
      `);
      console.log("✅ Вся база данных здоровья очищена");
    }
  } catch (error) {
    console.error("❌ Ошибка при очистке базы данных здоровья:", error);
    throw error;
  }
}

/**
 * Полная очистка всех баз данных
 */
export async function clearAllDatabases(userId?: number): Promise<void> {
  await clearAllMedicineData(userId);
  await clearAllHealthData(userId);
  console.log("✅ Все базы данных очищены");
}







