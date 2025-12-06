import * as Notifications from "expo-notifications";
import { getDB } from "./medicine.database";
import { 
  createMedicineApi, 
  updateMedicineApi, 
  deleteMedicineApi,
  isOnline 
} from "../services/medicine-sync.service";

// ----------------------------------------------------
// 💾 СОХРАНИТЬ ЛЕКАРСТВО (SQLite + API синхронизация)
// ----------------------------------------------------
export async function saveMedicine({ 
  name, 
  dose, 
  form, 
  expiry, 
  photoUri, 
  userId, 
  serverId 
}) {
  const db = await getDB();

  const result = await db.runAsync(
    `
      INSERT INTO medicines (name, dose, form, expiry, photoUri, userId, serverId, createdAt, syncedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `,
    [name, dose, form, expiry, photoUri, userId, serverId || null]
  );

  const medicineId = result.lastInsertRowId;

  // 🔔 Автоматически создаем напоминания о сроке годности
  if (expiry) {
    await scheduleExpiryNotifications(medicineId, name, dose, expiry);
  }

  // 📤 Синхронизируем с сервером (если онлайн)
  if (await isOnline() && !serverId) {
    try {
      const serverMedicine = await createMedicineApi(userId, {
        name,
        dose,
        form,
        expiry,
        photoUri,
      });

      // Обновляем локальную запись с serverId
      if (serverMedicine.id) {
        await db.runAsync(
          `UPDATE medicines SET serverId = ?, syncedAt = datetime('now') WHERE id = ?`,
          [serverMedicine.id, medicineId]
        );
        console.log("✅ Лекарство синхронизировано с сервером");
      }
    } catch (error) {
      console.log("⚠️ Ошибка синхронизации с сервером (работаем офлайн):", error);
      // Продолжаем работу офлайн - синхронизация произойдет позже
    }
  }

  return medicineId;
}

// ----------------------------------------------------
// 📌 ПОЛУЧИТЬ ВСЕ ЛЕКАРСТВА
// ----------------------------------------------------
export async function getAllMedicines(userId: number) {
  const db = await getDB();

  return await db.getAllAsync(
    `
      SELECT *
      FROM medicines
      WHERE userId = ?
      ORDER BY id DESC
    `,
    [userId]
  );
}

// ----------------------------------------------------
// ✏️ ОБНОВИТЬ ЛЕКАРСТВО (SQLite + API синхронизация)
// ----------------------------------------------------
export async function updateMedicine(id: number, userId: number, data: {
  name?: string;
  dose?: string;
  form?: string;
  expiry?: string;
  photoUri?: string;
}) {
  const db = await getDB();

  // Получаем текущее лекарство
  const medicine = await db.getFirstAsync(
    `SELECT * FROM medicines WHERE id = ?`,
    [id]
  );

  if (!medicine) {
    throw new Error("Лекарство не найдено");
  }

  // Обновляем локально
  await db.runAsync(
    `
      UPDATE medicines 
      SET name = ?, dose = ?, form = ?, expiry = ?, photoUri = ?, syncedAt = datetime('now')
      WHERE id = ?
    `,
    [
      data.name ?? medicine.name,
      data.dose ?? medicine.dose,
      data.form ?? medicine.form,
      data.expiry ?? medicine.expiry,
      data.photoUri ?? medicine.photoUri,
      id,
    ]
  );

  // 📤 Синхронизируем с сервером (если онлайн и есть serverId)
  if (medicine.serverId && await isOnline()) {
    try {
      await updateMedicineApi(userId, medicine.serverId, data);
      console.log("✅ Лекарство обновлено на сервере");
    } catch (error) {
      console.log("⚠️ Ошибка обновления на сервере:", error);
      // Продолжаем работу - лекарство уже обновлено локально
    }
  }
}

// ----------------------------------------------------
// 🗑️ УДАЛИТЬ ЛЕКАРСТВО (SQLite + API синхронизация)
// ----------------------------------------------------
export async function deleteMedicine(id: number, userId?: number) {
  const db = await getDB();

  // Получаем информацию о лекарстве перед удалением
  const medicine = await db.getFirstAsync(
    `SELECT * FROM medicines WHERE id = ?`,
    [id]
  );

  // Удаляем локально
  await db.runAsync(
    `
      DELETE FROM medicines
      WHERE id = ?
    `,
    [id]
  );

  // 📤 Удаляем на сервере (если онлайн и есть serverId)
  if (medicine?.serverId && userId && await isOnline()) {
    try {
      await deleteMedicineApi(userId, medicine.serverId);
      console.log("✅ Лекарство удалено с сервера");
    } catch (error) {
      console.log("⚠️ Ошибка удаления с сервера:", error);
      // Продолжаем работу - лекарство уже удалено локально
    }
  }
}

// ----------------------------------------------------
// ⛔ ПРОСРОЧЕННЫЕ
// ----------------------------------------------------
export async function getExpiredMedicines() {
  const db = await getDB();
  const today = new Date().toISOString().split("T")[0];

  return await db.getAllAsync(
    `
      SELECT *
      FROM medicines
      WHERE expiry IS NOT NULL
        AND expiry <> ''
        AND DATE(expiry) < DATE(?)
    `,
    [today]
  );
}

// ----------------------------------------------------
// ⚠️ СКОРО ПРОСРОЧАТСЯ (7 дней)
// ----------------------------------------------------
export async function getExpiringSoonMedicines() {
  const db = await getDB();
  const today = new Date().toISOString().split("T")[0];

  return await db.getAllAsync(
    `
      SELECT *
      FROM medicines
      WHERE expiry IS NOT NULL
        AND expiry <> ''
        AND DATE(expiry) >= DATE(?)
        AND DATE(expiry) <= DATE(?, '+7 days')
    `,
    [today, today]
  );
}

// ----------------------------------------------------
// 🔔 СИСТЕМА PUSH УВЕДОМЛЕНИЙ
// ----------------------------------------------------
async function sendPush(title, body) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // отправить сразу
    });
  } catch (e) {
    console.log("Push send error:", e);
  }
}

// ----------------------------------------------------
// 📅 АВТОМАТИЧЕСКОЕ НАПОМИНАНИЕ О СРОКЕ ГОДНОСТИ
// ----------------------------------------------------
export async function scheduleExpiryNotifications(medicineId: number, name: string, dose: string | null, expiry: string) {
  try {
    // Запрашиваем разрешение на уведомления
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== "granted") {
        console.log("⚠️ Разрешение на уведомления не предоставлено");
        return;
      }
    }

    const expiryDate = new Date(expiry);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);

    // Проверяем, не просрочено ли уже
    if (expiryDate < today) {
      // Если просрочено, отправляем уведомление сразу
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "⛔ Лекарство просрочено",
          body: `${name}${dose ? ` (${dose})` : ""} - срок годности истёк ${expiry}`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // сразу
      });
      return;
    }

    // Напоминание за 7 дней до истечения
    const sevenDaysBefore = new Date(expiryDate);
    sevenDaysBefore.setDate(sevenDaysBefore.getDate() - 7);
    sevenDaysBefore.setHours(9, 0, 0, 0); // 9:00 утра

    if (sevenDaysBefore > today) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "⚠️ Лекарство скоро истечёт",
          body: `${name}${dose ? ` (${dose})` : ""} - осталось 7 дней до ${expiry}`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { medicineId, type: "expiring_soon" },
        },
        trigger: sevenDaysBefore,
      });
    }

    // Напоминание за 3 дня до истечения
    const threeDaysBefore = new Date(expiryDate);
    threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
    threeDaysBefore.setHours(9, 0, 0, 0);

    if (threeDaysBefore > today) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "⚠️ Лекарство скоро истечёт",
          body: `${name}${dose ? ` (${dose})` : ""} - осталось 3 дня до ${expiry}`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { medicineId, type: "expiring_soon" },
        },
        trigger: threeDaysBefore,
      });
    }

    // Напоминание за 1 день до истечения
    const oneDayBefore = new Date(expiryDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);
    oneDayBefore.setHours(9, 0, 0, 0);

    if (oneDayBefore > today) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "⚠️ Лекарство истекает завтра",
          body: `${name}${dose ? ` (${dose})` : ""} - срок годности истекает ${expiry}`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { medicineId, type: "expiring_tomorrow" },
        },
        trigger: oneDayBefore,
      });
    }

    // Напоминание в день истечения
    const expiryDay = new Date(expiryDate);
    expiryDay.setHours(9, 0, 0, 0);

    if (expiryDay >= today) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "⛔ Лекарство истекает сегодня",
          body: `${name}${dose ? ` (${dose})` : ""} - срок годности истекает сегодня!`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { medicineId, type: "expiring_today" },
        },
        trigger: expiryDay,
      });
    }

    console.log("✅ Напоминания о сроке годности настроены для:", name);
  } catch (error) {
    console.error("❌ Ошибка настройки напоминаний:", error);
  }
}

// ----------------------------------------------------
// ⏳ ЕЖЕДНЕВНАЯ ПРОВЕРКА ПРОСРОЧЕК
// ----------------------------------------------------
export async function checkExpiryDaily() {
  try {
    // Запрашиваем разрешение на уведомления
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== "granted") {
        console.log("⚠️ Разрешение на уведомления не предоставлено");
        return { expired: [], expiringSoon: [] };
      }
    }

    const expired = await getExpiredMedicines();
    const expiringSoon = await getExpiringSoonMedicines();

    // Отправляем уведомления о просроченных (если еще не отправляли сегодня)
    for (const med of expired) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "⛔ Лекарство просрочено",
          body: `${med.name}${med.dose ? ` (${med.dose})` : ""} - срок годности истёк ${med.expiry}`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { medicineId: med.id, type: "expired" },
        },
        trigger: null, // сразу
      });
    }

    // Отправляем уведомления о скоро истекающих (если еще не отправляли сегодня)
    for (const med of expiringSoon) {
      const expiryDate = new Date(med.expiry);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expiryDate.setHours(0, 0, 0, 0);
      
      const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "⚠️ Лекарство скоро истечёт",
          body: `${med.name}${med.dose ? ` (${med.dose})` : ""} - осталось ${daysLeft} ${daysLeft === 1 ? "день" : daysLeft < 5 ? "дня" : "дней"} до ${med.expiry}`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { medicineId: med.id, type: "expiring_soon" },
        },
        trigger: null, // сразу
      });
    }

    return { expired, expiringSoon };
  } catch (e) {
    console.log("checkExpiryDaily error:", e);
    return { expired: [], expiringSoon: [] };
  }
}

// ----------------------------------------------------
// 🔄 ПЕРЕСОЗДАТЬ НАПОМИНАНИЯ ДЛЯ ВСЕХ ЛЕКАРСТВ
// ----------------------------------------------------
export async function rescheduleAllExpiryNotifications(userId: number) {
  try {
    const medicines = await getAllMedicines(userId);
    
    for (const med of medicines) {
      if (med.expiry) {
        await scheduleExpiryNotifications(
          med.id,
          med.name,
          med.dose,
          med.expiry
        );
      }
    }

    console.log(`✅ Напоминания пересозданы для ${medicines.length} лекарств`);
  } catch (error) {
    console.error("❌ Ошибка пересоздания напоминаний:", error);
  }
}
