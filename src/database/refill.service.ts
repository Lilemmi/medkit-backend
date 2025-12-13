import { getDB } from "./medicine.database";

// ----------------------------------------------------
// 🔍 ПРОВЕРИТЬ СОВПАДЕНИЕ НАЗВАНИЙ ПО СЛОВАМ
// ----------------------------------------------------
function checkNameMatchByWords(refillName: string, medicineName: string): boolean {
  // Нормализуем названия: приводим к нижнему регистру и разбиваем на слова
  const normalize = (name: string): string[] => {
    return name
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0); // Убираем пустые строки
  };

  const refillWords = normalize(refillName);
  const medicineWords = normalize(medicineName);

  // Если одно из названий пустое, возвращаем false
  if (refillWords.length === 0 || medicineWords.length === 0) {
    return false;
  }

  // Проверяем, есть ли хотя бы одно совпадающее слово
  for (const refillWord of refillWords) {
    if (medicineWords.includes(refillWord)) {
      return true; // Найдено совпадение по слову
    }
  }

  return false; // Совпадений не найдено
}

// ----------------------------------------------------
// 🔍 ПРОВЕРИТЬ, ЕСТЬ ЛИ ЛЕКАРСТВО В АПТЕЧКЕ ПО СЛОВАМ
// ----------------------------------------------------
async function checkMedicineExistsByWords(userId: number, medicineName: string): Promise<boolean> {
  const db = await getDB();

  try {
    // Получаем все лекарства пользователя
    const medicines = await db.getAllAsync<import("../types/db").MedicineRow>(
      `SELECT name FROM medicines WHERE userId = ? AND name IS NOT NULL AND name <> ''`,
      [userId]
    );

    // Проверяем каждое лекарство на совпадение по словам
    for (const medicine of medicines) {
      if (medicine.name && checkNameMatchByWords(medicineName, medicine.name)) {
        console.log(`✅ Найдено совпадение: "${medicineName}" совпадает с "${medicine.name}" по словам`);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Ошибка проверки лекарства по словам:", error);
    return false;
  }
}

// ----------------------------------------------------
// 🛒 СОЗДАТЬ УВЕДОМЛЕНИЕ О ПОПОЛНЕНИИ
// ----------------------------------------------------
export async function createRefillNotification({
  medicineName,
  dose,
  reason,
  reasonType,
  medicineId,
  userId,
}: {
  medicineName: string;
  dose?: string;
  reason: string;
  reasonType: "missing" | "expiring" | "low_stock" | "expired";
  medicineId?: number;
  userId: number;
}) {
  const db = await getDB();

  // Проверяем, есть ли лекарство в аптечке по словам
  // Это предотвращает создание уведомлений для лекарств, которые уже есть в аптечке
  // Например: "Modal" не создаст уведомление, если в аптечке есть "Modal Capsules"
  const existsByWords = await checkMedicineExistsByWords(userId, medicineName);
  if (existsByWords) {
    console.log(`⏭️ Пропущено создание уведомления для "${medicineName}" - найдено совпадение в аптечке по словам`);
    return null; // Не создаем уведомление, если лекарство уже есть в аптечке
  }

  // Нормализуем название лекарства для сравнения (убираем пробелы, приводим к нижнему регистру)
  const normalizedName = medicineName.trim().toLowerCase();

  // Проверяем, нет ли уже активного уведомления для этого лекарства с такой же причиной
  // Проверяем как по точному совпадению, так и по нормализованному названию
  const existing = await db.getFirstAsync<{ id: number }>(
    `
      SELECT id FROM refill_notifications
      WHERE (
        (LOWER(TRIM(medicineName)) = ? OR medicineName = ?)
        AND reasonType = ? 
        AND userId = ? 
        AND isResolved = 0
      )
      OR (
        medicineId = ? 
        AND reasonType = ? 
        AND userId = ? 
        AND isResolved = 0
        AND ? IS NOT NULL
      )
    `,
    [
      normalizedName, 
      medicineName.trim(), 
      reasonType, 
      userId,
      medicineId || null,
      reasonType,
      userId,
      medicineId || null
    ]
  );

  if (existing) {
    // Обновляем существующее уведомление вместо создания дубликата
    await db.runAsync(
      `
        UPDATE refill_notifications
        SET dose = ?, reason = ?, medicineName = ?, updatedAt = datetime('now')
        WHERE id = ?
      `,
      [dose || null, reason, medicineName.trim(), existing.id]
    );
    console.log(`✅ Обновлено существующее уведомление о пополнении для "${medicineName}" (тип: ${reasonType})`);
    return existing.id;
  }

  // Создаем новое уведомление
  const result = await db.runAsync(
    `
      INSERT INTO refill_notifications (medicineName, dose, reason, reasonType, medicineId, userId, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `,
    [medicineName.trim(), dose || null, reason, reasonType, medicineId || null, userId]
  );

  console.log(`✅ Создано новое уведомление о пополнении для "${medicineName}" (тип: ${reasonType})`);
  
  // Обновляем периодические напоминания о пополнении (динамический импорт для избежания циклической зависимости)
  try {
    const { updateRefillReminders } = await import("../services/refill-reminder.service");
    await updateRefillReminders(userId);
  } catch (error) {
    console.log("⚠️ Ошибка обновления периодических напоминаний:", error);
  }
  
  return result.lastInsertRowId ?? 0;
}

// ----------------------------------------------------
// 📌 ПОЛУЧИТЬ ВСЕ УВЕДОМЛЕНИЯ О ПОПОЛНЕНИИ
// ----------------------------------------------------
export async function getAllRefillNotifications(userId: number) {
  const db = await getDB();

  const notifications = await db.getAllAsync<import("../types/db").RefillNotification>(
    `
      SELECT * FROM refill_notifications
      WHERE userId = ? AND isResolved = 0
      ORDER BY 
        CASE reasonType
          WHEN 'expired' THEN 1
          WHEN 'expiring' THEN 2
          WHEN 'missing' THEN 3
          WHEN 'low_stock' THEN 4
          ELSE 5
        END,
        createdAt DESC
    `,
    [userId]
  );

  return notifications;
}

// ----------------------------------------------------
// ✅ ОТМЕТИТЬ УВЕДОМЛЕНИЕ КАК РЕШЕННОЕ
// ----------------------------------------------------
export async function resolveRefillNotification(id: number) {
  const db = await getDB();

  // Получаем userId перед обновлением
  const notification = await db.getFirstAsync<{ userId: number }>(
    `SELECT userId FROM refill_notifications WHERE id = ?`,
    [id]
  );

  await db.runAsync(
    `
      UPDATE refill_notifications
      SET isResolved = 1, resolvedAt = datetime('now')
      WHERE id = ?
    `,
    [id]
  );

  // Обновляем периодические напоминания о пополнении (динамический импорт)
  if (notification?.userId) {
    try {
      const { updateRefillReminders } = await import("../services/refill-reminder.service");
      await updateRefillReminders(notification.userId);
    } catch (error) {
      console.log("⚠️ Ошибка обновления периодических напоминаний:", error);
    }
  }
}

// ----------------------------------------------------
// 🗑️ УДАЛИТЬ УВЕДОМЛЕНИЕ
// ----------------------------------------------------
export async function deleteRefillNotification(id: number) {
  const db = await getDB();

  await db.runAsync(
    `
      DELETE FROM refill_notifications
      WHERE id = ?
    `,
    [id]
  );
}

// ----------------------------------------------------
// 🔍 НАЙТИ ЛЕКАРСТВО ПО НАЗВАНИЮ
// ----------------------------------------------------
export async function findMedicineByName(userId: number, medicineName: string): Promise<any | null> {
  const db = await getDB();

  // Ищем лекарство по точному совпадению или похожему названию
  const medicine = await db.getFirstAsync<import("../types/db").MedicineRow>(
    `
      SELECT * FROM medicines
      WHERE userId = ? AND LOWER(name) = LOWER(?)
      LIMIT 1
    `,
    [userId, medicineName.trim()]
  );

  return medicine || null;
}

// ----------------------------------------------------
// 🗑️ АВТОМАТИЧЕСКОЕ УДАЛЕНИЕ УВЕДОМЛЕНИЙ О ПОПОЛНЕНИИ
// ----------------------------------------------------
export async function autoResolveRefillNotifications(medicineId: number, medicineName: string, userId: number) {
  const db = await getDB();

  // Нормализуем название для сравнения
  const normalizedName = medicineName.trim().toLowerCase();

  // Получаем все активные уведомления о пополнении
  const notifications = await db.getAllAsync<{ id: number; medicineName: string }>(
    `
      SELECT id, medicineName FROM refill_notifications
      WHERE userId = ? AND isResolved = 0
    `,
    [userId]
  );

  // Проверяем каждое уведомление на совпадение по словам
  const notificationsToResolve: number[] = [];
  for (const notification of notifications) {
    // Проверяем по medicineId
    if (notification.id && medicineId) {
      const notificationWithId = await db.getFirstAsync<{ medicineId: number | null }>(
        `SELECT medicineId FROM refill_notifications WHERE id = ?`,
        [notification.id]
      );
      if (notificationWithId?.medicineId === medicineId) {
        notificationsToResolve.push(notification.id);
        continue;
      }
    }

    // Проверяем по точному совпадению названия
    if (notification.medicineName && 
        (notification.medicineName.toLowerCase() === normalizedName || 
         notification.medicineName.toLowerCase() === medicineName.trim().toLowerCase())) {
      notificationsToResolve.push(notification.id);
      continue;
    }

    // Проверяем по совпадению слов
    if (notification.medicineName && checkNameMatchByWords(medicineName, notification.medicineName)) {
      notificationsToResolve.push(notification.id);
    }
  }

  // Удаляем найденные уведомления
  if (notificationsToResolve.length > 0) {
    const placeholders = notificationsToResolve.map(() => '?').join(',');
    const result = await db.runAsync(
      `
        UPDATE refill_notifications
        SET isResolved = 1, resolvedAt = datetime('now')
        WHERE id IN (${placeholders})
      `,
      notificationsToResolve
    );

    if ((result.changes ?? 0) > 0) {
      console.log(`✅ Автоматически удалено ${result.changes} уведомлений о пополнении для "${medicineName}"`);
      
      // Обновляем периодические напоминания о пополнении (динамический импорт)
      try {
        const { updateRefillReminders } = await import("../services/refill-reminder.service");
        await updateRefillReminders(userId);
      } catch (error) {
        console.log("⚠️ Ошибка обновления периодических напоминаний:", error);
      }
    }

    return result.changes;
  }

  return 0;
}

