import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getDB } from "./medicine.database";
import { 
  createMedicineApi, 
  updateMedicineApi, 
  deleteMedicineApi
} from "../api/medicines";
import { isOnline } from "../utils/network";
import { createRefillNotification } from "./refill.service";

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
  serverId,
  takeWithFood,
  takeWithLiquid,
  incompatibleMedicines,
  compatibleMedicines,
  forbiddenFoods,
  recommendedFoods,
  alcoholInteraction,
  caffeineInteraction,
  storageConditions,
  specialInstructions,
  sideEffects,
  contraindications,
  quantity,
  totalPills,
  usedPills,
  pillsPerDose,
  lowStockThreshold,
  familyMemberId,
  userDosage,
  // Новые поля для расширенной информации
  internationalName,
  manufacturer,
  packageVolume,
  category,
  activeIngredients,
  indications,
  contraindicationsDetailed,
  warnings,
  foodCompatibility,
  drugCompatibility,
  dosageDetailed,
  childrenRestrictions,
  sideEffectsDetailed,
  storageConditionsDetailed,
  additionalRecommendations,
  specialGroupsInfo,
  analogs,
}: any) {
  const db = await getDB();

  // Вспомогательная функция для безопасного преобразования в JSON строку
  const safeStringify = (value: any): string | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch (error) {
      console.error('Ошибка преобразования в JSON:', error, value);
      return null;
    }
  };

  // Сохраняем фотографию в постоянную папку, если она еще не там
  let finalPhotoUri = photoUri;
  if (photoUri && !photoUri.startsWith('http://') && !photoUri.startsWith('https://') && !photoUri.includes('medicine_photos/')) {
    try {
      const { saveMedicinePhoto } = await import("../utils/medicine-photo-storage");
      // Получаем временный ID для сохранения (будет обновлен после сохранения в БД)
      const tempId = Date.now();
      const savedUri = await saveMedicinePhoto(photoUri, tempId, userId);
      if (savedUri) {
        finalPhotoUri = savedUri;
      }
    } catch (error) {
      console.error("Ошибка сохранения фотографии в постоянную папку:", error);
      // Продолжаем с оригинальным URI
    }
  }

  const result = await db.runAsync(
    `
      INSERT INTO medicines (
        name, dose, form, expiry, photoUri, userId, serverId, createdAt, syncedAt,
        takeWithFood, takeWithLiquid, incompatibleMedicines, compatibleMedicines,
        forbiddenFoods, recommendedFoods, alcoholInteraction, caffeineInteraction,
        storageConditions, specialInstructions, sideEffects, contraindications,         quantity,
        totalPills, usedPills, pillsPerDose, lowStockThreshold, familyMemberId, userDosage,
        internationalName, manufacturer, packageVolume, category, activeIngredients,
        indications, contraindicationsDetailed, warnings, foodCompatibility, drugCompatibility,
        dosageDetailed, childrenRestrictions, sideEffectsDetailed, storageConditionsDetailed,
        additionalRecommendations, specialGroupsInfo, analogs
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      name, 
      dose, 
      form, 
      expiry, 
      // Сохраняем локальные фото (file://) и URL из интернета
      finalPhotoUri ?? null, 
      userId, 
      serverId ?? null,
      takeWithFood ?? null,
      takeWithLiquid ?? null,
      safeStringify(incompatibleMedicines),
      safeStringify(compatibleMedicines),
      safeStringify(forbiddenFoods),
      safeStringify(recommendedFoods),
      alcoholInteraction ?? null,
      caffeineInteraction ?? null,
      storageConditions ?? null,
      specialInstructions ?? null,
      sideEffects ?? null,
      contraindications ?? null,
      (quantity ?? 1),
      totalPills ?? null,
      usedPills ?? 0,
      (pillsPerDose ?? 1), // По умолчанию 1 таблетка на прием
      (lowStockThreshold ?? 10), // По умолчанию уведомление при остатке 10 таблеток
      familyMemberId ?? null,
      userDosage ?? null,
      // Новые поля - безопасное преобразование в JSON строки
      internationalName || null,
      manufacturer || null,
      packageVolume || null,
      category || null,
      safeStringify(activeIngredients),
      safeStringify(indications),
      safeStringify(contraindicationsDetailed),
      safeStringify(warnings),
      safeStringify(foodCompatibility),
      safeStringify(drugCompatibility),
      safeStringify(dosageDetailed),
      safeStringify(childrenRestrictions),
      safeStringify(sideEffectsDetailed),
      safeStringify(storageConditionsDetailed),
      safeStringify(additionalRecommendations),
      safeStringify(specialGroupsInfo),
      safeStringify(analogs),
    ]
  );

    const medicineId = result.lastInsertRowId ?? 0; // Ensure number for subsequent operations

  // Обновляем путь к фотографии с правильным ID лекарства (если использовался временный ID)
  if (finalPhotoUri && finalPhotoUri.includes('medicine_photos/')) {
    try {
      // Используем legacy API для избежания предупреждений о deprecated методах
      const FileSystemModule = await import('expo-file-system/legacy');
      // При динамическом импорте legacy API методы могут быть в .default или напрямую
      const FileSystem: any = (FileSystemModule as any).default || FileSystemModule;
      // Проверяем, есть ли временный timestamp в имени файла
      const tempIdPattern = /medicine_\d+_\d+_\d+\.jpg/;
      if (tempIdPattern.test(finalPhotoUri)) {
        const photosDir = await (await import("../utils/medicine-photo-storage")).getMedicinePhotosDirectory();
        const newFileName = `medicine_${userId}_${medicineId}_${Date.now()}.jpg`;
        const newUri = `${photosDir}${newFileName}`;
        
        // Копируем файл с правильным ID
        await FileSystem.copyAsync({
          from: finalPhotoUri,
          to: newUri,
        });
        await FileSystem.deleteAsync(finalPhotoUri, { idempotent: true });
        
        // Обновляем photoUri в базе данных
        await db.runAsync(
          `UPDATE medicines SET photoUri = ? WHERE id = ?`,
          [newUri, medicineId]
        );
        finalPhotoUri = newUri;
      }
    } catch (error) {
      console.error("Ошибка обновления пути к фотографии:", error);
    }
  }

  // 🗑️ Автоматически удаляем уведомления о пополнении для этого лекарства
  try {
    const { autoResolveRefillNotifications } = await import("./refill.service");
    await autoResolveRefillNotifications(medicineId, name, userId);
  } catch (error) {
    console.log("⚠️ Ошибка автоматического удаления уведомлений о пополнении:", error);
  }

  // 🔔 Автоматически создаем напоминания о сроке годности
  if (expiry) {
    // Проверяем, что дата валидна перед использованием
    const expiryDateObj = new Date(expiry);
    const isValidDate = !isNaN(expiryDateObj.getTime()) && 
                        expiry !== "Not visible" && 
                        expiry !== "—" && 
                        expiry !== "-" &&
                        expiry.trim() !== "";
    
    if (isValidDate) {
      await scheduleExpiryNotifications(medicineId, name, dose, expiry);
      
      // Проверяем, не просрочено ли лекарство сразу после добавления
      const today = new Date().toISOString().split("T")[0];
      const expiryDate = expiryDateObj.toISOString().split("T")[0];
      
      if (expiryDate < today) {
        // Лекарство уже просрочено - создаем уведомление о пополнении
        await createRefillNotification({
          medicineName: name,
          dose: dose || null,
          reason: `Срок годности истёк ${expiry}. Необходимо приобрести новое лекарство.`,
          reasonType: "expired",
          medicineId: medicineId,
          userId: userId,
        });
        
        // Отправляем уведомление
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "⛔ Лекарство просрочено",
            body: `${name}${dose ? ` (${dose})` : ""} - срок годности истёк ${expiry}`,
            sound: "default",
            priority: Notifications.AndroidNotificationPriority.MAX,
            data: { medicineId, type: "expired" },
            categoryIdentifier: "medication-expired",
            // Android-специфичные настройки для работы при выключенном звуке
            ...(Platform.OS === "android" && {
              vibrate: [0, 250, 250, 250, 250, 250],
              lightColor: "#FF0000",
              sticky: true,
              autoDismiss: false,
            }),
          },
          trigger: null, // сразу
        });
      } else {
        // Проверяем, не истекает ли скоро (в течение 7 дней)
        const daysUntilExpiry = Math.ceil((new Date(expiryDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
          await createRefillNotification({
            medicineName: name,
            dose: dose || null,
            reason: `Срок годности истекает через ${daysUntilExpiry} ${daysUntilExpiry === 1 ? "день" : daysUntilExpiry < 5 ? "дня" : "дней"} (${expiry}). Рекомендуется приобрести новое лекарство.`,
            reasonType: "expiring",
            medicineId: medicineId,
            userId: userId,
          });
        }
      }
    } else {
      // Дата невалидна - не создаем напоминания
      console.log(`⚠️ Невалидная дата срока годности: "${expiry}" - пропускаем создание напоминаний`);
    }
  }

  // 📤 Синхронизируем с сервером (если онлайн)
  if (await isOnline() && !serverId) {
    // важно: объявляем заранее, чтобы было доступно в catch для логирования
    let medicineData: any = null;
    try {
      // Валидация и очистка данных перед отправкой на сервер
      const isValidExpiry = expiry && 
                            expiry !== "Not visible" && 
                            expiry !== "—" && 
                            expiry !== "-" &&
                            expiry.trim() !== "";
      
      // Проверяем, что дата валидна и преобразуем в ISO формат для Prisma
      let cleanExpiry = null;
      if (isValidExpiry) {
        try {
          const expiryDate = new Date(expiry);
          if (!isNaN(expiryDate.getTime())) {
            // Преобразуем в ISO формат (Prisma ожидает DateTime в формате ISO 8601)
            // Устанавливаем время на конец дня (23:59:59) для корректной обработки
            expiryDate.setHours(23, 59, 59, 999);
            cleanExpiry = expiryDate.toISOString();
          } else {
            console.log(`⚠️ Невалидная дата "${expiry}" для лекарства "${name}" - отправляем null`);
          }
        } catch (error) {
          console.log(`⚠️ Ошибка парсинга даты "${expiry}" для лекарства "${name}":`, error);
          cleanExpiry = null;
        }
      }
      
      // Валидация и очистка всех полей перед отправкой
      // Проверяем photoUri - если это локальный путь (file://), не отправляем его на сервер
      let cleanPhotoUri = null;
      if (photoUri) {
        const photoUriStr = String(photoUri).trim();
        // Если это не локальный путь (начинается с http:// или https://), отправляем
        if (photoUriStr.startsWith("http://") || photoUriStr.startsWith("https://")) {
          cleanPhotoUri = photoUriStr;
        } else {
          // Локальные пути (file://) не отправляем на сервер
          cleanPhotoUri = null;
        }
      }
      
      // Вспомогательная функция для безопасного преобразования в JSON
      const safeStringify = (value: any): any => {
        if (value === null || value === undefined) return null;
        if (typeof value === 'string') {
          try {
            // Если это уже JSON строка, возвращаем как есть
            JSON.parse(value);
            return value;
          } catch {
            // Если не JSON, возвращаем как строку
            return value;
          }
        }
        try {
          return JSON.stringify(value);
        } catch (error) {
          console.error('Ошибка преобразования в JSON:', error, value);
          return null;
        }
      };

      medicineData = {
        name: (name || "").trim(),
        dose: dose ? String(dose).trim() : null,
        form: form ? String(form).trim() : null,
        expiry: cleanExpiry,
        photoUri: cleanPhotoUri,
        // Добавляем все дополнительные поля
        takeWithFood: takeWithFood || null,
        takeWithLiquid: takeWithLiquid || null,
        incompatibleMedicines: safeStringify(incompatibleMedicines),
        compatibleMedicines: safeStringify(compatibleMedicines),
        forbiddenFoods: safeStringify(forbiddenFoods),
        recommendedFoods: safeStringify(recommendedFoods),
        alcoholInteraction: alcoholInteraction || null,
        caffeineInteraction: caffeineInteraction || null,
        storageConditions: storageConditions || null,
        specialInstructions: specialInstructions || null,
        // sideEffects и contraindications должны быть строками (не Json в Prisma)
        sideEffects: sideEffects ? (typeof sideEffects === 'string' ? sideEffects : JSON.stringify(sideEffects)) : null,
        contraindications: contraindications ? (typeof contraindications === 'string' ? contraindications : JSON.stringify(contraindications)) : null,
        quantity: quantity || null,
        totalPills: totalPills || null,
        usedPills: usedPills || null,
        lowStockThreshold: lowStockThreshold || null,
        familyMemberId: familyMemberId || null,
        userDosage: userDosage || null,
        // Расширенная информация о лекарстве
        internationalName: internationalName || null,
        manufacturer: manufacturer || null,
        packageVolume: packageVolume || null,
        category: category || null,
        activeIngredients: safeStringify(activeIngredients),
        indications: safeStringify(indications),
        contraindicationsDetailed: safeStringify(contraindicationsDetailed),
        warnings: safeStringify(warnings),
        foodCompatibility: safeStringify(foodCompatibility),
        drugCompatibility: safeStringify(drugCompatibility),
        dosageDetailed: safeStringify(dosageDetailed),
        childrenRestrictions: safeStringify(childrenRestrictions),
        sideEffectsDetailed: safeStringify(sideEffectsDetailed),
        storageConditionsDetailed: safeStringify(storageConditionsDetailed),
        additionalRecommendations: safeStringify(additionalRecommendations),
        specialGroupsInfo: safeStringify(specialGroupsInfo),
        analogs: safeStringify(analogs),
      };
      
      // Удаляем пустые строки, заменяя их на null
      if (medicineData.name === "") {
        medicineData.name = null;
      }
      if (medicineData.dose === "") {
        medicineData.dose = null;
      }
      if (medicineData.form === "") {
        medicineData.form = null;
      }
      if (medicineData.photoUri === "") {
        medicineData.photoUri = null;
      }
      
      // Проверяем, что хотя бы название есть
      if (!medicineData.name) {
        console.warn(`⚠️ Нельзя синхронизировать лекарство без названия`);
        throw new Error("Лекарство должно иметь название");
      }
      
      // Логируем данные перед отправкой для отладки
      console.log(`📤 Отправка на сервер: ${JSON.stringify(medicineData, null, 2)}`);
      
      const serverMedicine = await createMedicineApi(userId, medicineData);

      // Обновляем локальную запись с serverId
      if (serverMedicine.id) {
        await db.runAsync(
          `UPDATE medicines SET serverId = ?, syncedAt = datetime('now') WHERE id = ?`,
          [serverMedicine.id, medicineId]
        );
        console.log("✅ Лекарство синхронизировано с сервером");
      }
    } catch (error: any) {
      // Улучшенное логирование для диагностики ошибок 500
      if (error?.response?.status === 500) {
        console.log(`⚠️ Ошибка 500 при синхронизации "${name}":`, {
          status: error.response?.status,
          data: error.response?.data,
          sentData: medicineData,
        });
      } else {
        console.log("⚠️ Ошибка синхронизации с сервером (работаем офлайн):", error?.message || error);
      }
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

  const medicines = await db.getAllAsync<import("../types/db").MedicineRow>(
    `
      SELECT *
      FROM medicines
      WHERE userId = ?
      ORDER BY id DESC
    `,
    [userId]
  );

  // Очищаем невалидные photoUri асинхронно (не блокируем загрузку списка)
  // Локальные пути (file://, content://) без medicine_photos/ могут быть невалидными
  // после синхронизации с другого устройства
  Promise.all(medicines.map(async (medicine: any) => {
    if (medicine.photoUri) {
      const photoUri = String(medicine.photoUri).trim();
      
      // Если это локальный путь без medicine_photos/, проверяем существование
      if ((photoUri.startsWith('file://') || photoUri.startsWith('content://')) && 
          !photoUri.includes('medicine_photos/')) {
        try {
          const { checkPhotoExists } = await import("../utils/medicine-photo-storage");
          const exists = await checkPhotoExists(photoUri);
          
          if (!exists) {
            // Файл не существует - очищаем photoUri
            console.log(`⚠️ Фотография не найдена для лекарства ${medicine.id}, очищаем photoUri`);
            await db.runAsync(
              `UPDATE medicines SET photoUri = NULL WHERE id = ?`,
              [medicine.id]
            );
            medicine.photoUri = null;
          }
        } catch (error) {
          console.error(`Ошибка проверки фотографии для лекарства ${medicine.id}:`, error);
          // При ошибке проверки оставляем photoUri как есть
        }
      }
    }
  })).catch(error => {
    console.error("Ошибка при проверке фотографий:", error);
  });

  return medicines;
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
  quantity?: number;
  userDosage?: string;
  familyMemberId?: number | null;
}) {
  const db = await getDB();

  // Получаем текущее лекарство
  const medicine = await db.getFirstAsync<import("../types/db").MedicineRow>(
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
      SET name = ?, dose = ?, form = ?, expiry = ?, photoUri = ?, 
          quantity = ?, userDosage = ?, familyMemberId = ?, syncedAt = datetime('now')
      WHERE id = ?
    `,
    [
      data.name ?? medicine.name ?? null,
      data.dose ?? medicine.dose ?? null,
      data.form ?? medicine.form ?? null,
      data.expiry ?? medicine.expiry ?? null,
      data.photoUri ?? medicine.photoUri ?? null,
      data.quantity ?? medicine.quantity ?? 1,
      data.userDosage ?? medicine.userDosage ?? null,
      data.familyMemberId !== undefined ? data.familyMemberId : (medicine.familyMemberId ?? null),
      id,
    ]
  );

  // 📤 Синхронизируем с сервером (если онлайн и есть serverId)
  if (medicine.serverId && await isOnline()) {
    try {
      // НЕ синхронизируем локальные пути к фотографиям на сервер
      // Локальные пути (file://, content://) специфичны для каждого устройства
      // Синхронизируем только URL из интернета (http://, https://)
      const dataToSync: any = { ...data };
      if (dataToSync.photoUri) {
        const photoUri = String(dataToSync.photoUri).trim();
        if (!photoUri.startsWith('http://') && !photoUri.startsWith('https://')) {
          // Это локальный путь - не отправляем на сервер
          delete dataToSync.photoUri;
        }
      }
      
      // Преобразуем null в undefined для совместимости с API типами
      if (dataToSync.familyMemberId === null) {
        dataToSync.familyMemberId = undefined;
      }
      
      await updateMedicineApi(userId, medicine.serverId, dataToSync);
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
  const medicine = await db.getFirstAsync<import("../types/db").MedicineRow>(
    `SELECT * FROM medicines WHERE id = ?`,
    [id]
  );

  if (!medicine) {
    throw new Error("Лекарство не найдено");
  }

  // Если userId не передан, пытаемся получить из лекарства
  const finalUserId = userId || medicine.userId;
  
  if (!finalUserId) {
    throw new Error("Не указан userId для удаления лекарства");
  }

  // 🗑️ Удаляем фотографию из файловой системы, если она есть
  if (medicine.photoUri) {
    try {
      const { deleteMedicinePhoto } = await import("../utils/medicine-photo-storage");
      await deleteMedicinePhoto(medicine.photoUri);
      console.log("🗑️ Фотография лекарства удалена из файловой системы");
    } catch (error) {
      console.error("⚠️ Ошибка удаления фотографии:", error);
      // Продолжаем удаление лекарства, даже если не удалось удалить фото
    }
  }

  // 🗑️ Удаляем связанные напоминания и отменяем уведомления
  try {
    const { getAllReminders, deleteReminder } = await import("./reminders.service");
    const reminders = await getAllReminders(finalUserId);
    const medicineReminders = reminders.filter((r: any) => r.medicineId === id);
    
    for (const reminder of medicineReminders) {
      // Отменяем запланированное уведомление
      if (reminder.notificationId) {
        try {
          await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
        } catch (error) {
          console.log("⚠️ Ошибка отмены уведомления:", error);
        }
      }
      // Удаляем напоминание из базы данных
      await deleteReminder(reminder.id);
    }
    if (medicineReminders.length > 0) {
      console.log(`🗑️ Удалено ${medicineReminders.length} напоминаний для лекарства`);
    }
  } catch (error) {
    console.error("⚠️ Ошибка удаления напоминаний:", error);
  }

  // 🗑️ Удаляем уведомления о пополнении для этого лекарства
  try {
    await db.runAsync(
      `DELETE FROM refill_notifications WHERE medicineId = ? AND userId = ?`,
      [id, finalUserId]
    );
    console.log("🗑️ Уведомления о пополнении удалены");
  } catch (error) {
    console.error("⚠️ Ошибка удаления уведомлений о пополнении:", error);
  }

  // 🗑️ Удаляем логи приема лекарства (medication_log)
  try {
    await db.runAsync(
      `DELETE FROM medication_log WHERE medicineId = ? AND userId = ?`,
      [id, finalUserId]
    );
    console.log("🗑️ Логи приема лекарства удалены");
  } catch (error) {
    console.error("⚠️ Ошибка удаления логов приема:", error);
  }

  // Если у лекарства есть serverId, сохраняем его в таблицу удаленных
  // чтобы предотвратить восстановление при синхронизации
  if (medicine.serverId) {
    try {
      await db.runAsync(
        `
          INSERT OR IGNORE INTO deleted_medicines (serverId, userId, deletedAt)
          VALUES (?, ?, datetime('now'))
        `,
        [medicine.serverId, finalUserId]
      );
      console.log("✅ Лекарство добавлено в список удаленных (serverId:", medicine.serverId, ")");
    } catch (error) {
      console.log("⚠️ Ошибка сохранения в список удаленных:", error);
    }
  }

  // Удаляем локально
  await db.runAsync(
    `
      DELETE FROM medicines
      WHERE id = ?
    `,
    [id]
  );
  console.log("🗑️ Лекарство удалено локально (id:", id, ")");

  // 📤 Удаляем на сервере (если онлайн и есть serverId)
  if (medicine.serverId && await isOnline()) {
    try {
      await deleteMedicineApi(finalUserId, medicine.serverId);
      console.log("✅ Лекарство удалено с сервера (serverId:", medicine.serverId, ")");
      
      // Удаляем запись из таблицы удаленных, так как удаление синхронизировано
      await db.runAsync(
        `DELETE FROM deleted_medicines WHERE serverId = ? AND userId = ?`,
        [medicine.serverId, finalUserId]
      );
    } catch (error: any) {
      const statusCode = error?.response?.status;
      
      if (statusCode === 404) {
        // Лекарство уже удалено с сервера или маршрут не найден - это нормально
        // Удаляем запись из deleted_medicines, так как лекарство уже не существует на сервере
        await db.runAsync(
          `DELETE FROM deleted_medicines WHERE serverId = ? AND userId = ?`,
          [medicine.serverId, finalUserId]
        );
        // Не логируем 404 как ошибку - это нормальная ситуация
      } else {
        // Другие ошибки - логируем только если не 404
        if (statusCode !== 404) {
          console.log(`⚠️ Ошибка удаления с сервера (статус: ${statusCode}):`, error?.message || error);
        }
        // Продолжаем работу - лекарство уже удалено локально и добавлено в список удаленных
        // Запись останется в deleted_medicines, чтобы предотвратить восстановление при синхронизации
      }
    }
  } else if (medicine.serverId) {
    console.log("📴 Офлайн режим - лекарство останется в списке удаленных для предотвращения восстановления");
  }
}

// ----------------------------------------------------
// ⛔ ПРОСРОЧЕННЫЕ
// ----------------------------------------------------
export async function getExpiredMedicines(userId?: number) {
  const db = await getDB();
  const today = new Date().toISOString().split("T")[0];

  if (userId) {
    return await db.getAllAsync<import("../types/db").MedicineRow>(
      `
        SELECT *
        FROM medicines
        WHERE userId = ?
          AND expiry IS NOT NULL
          AND expiry <> ''
          AND DATE(expiry) < DATE(?)
      `,
      [userId, today]
    );
  }

  return await db.getAllAsync<import("../types/db").MedicineRow>(
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
export async function getExpiringSoonMedicines(userId?: number) {
  const db = await getDB();
  const today = new Date().toISOString().split("T")[0];

  if (userId) {
    return await db.getAllAsync<import("../types/db").MedicineRow>(
      `
        SELECT *
        FROM medicines
        WHERE userId = ?
          AND expiry IS NOT NULL
          AND expiry <> ''
          AND DATE(expiry) >= DATE(?)
          AND DATE(expiry) <= DATE(?, '+7 days')
      `,
      [userId, today, today]
    );
  }

  return await db.getAllAsync<import("../types/db").MedicineRow>(
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
async function sendPush(title: string, body: string) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default", // Звук по умолчанию
        priority: Notifications.AndroidNotificationPriority.MAX, // Максимальный приоритет
        categoryIdentifier: "medication-alert", // Категория для группировки
        // Android-специфичные настройки для работы при выключенном звуке
        ...(Platform.OS === "android" && {
          vibrate: [0, 250, 250, 250, 250, 250],
          lightColor: "#FF0000",
          sticky: true,
          autoDismiss: false,
        }),
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
    // Проверяем, что дата валидна
    if (!expiry || 
        expiry === "Not visible" || 
        expiry === "—" || 
        expiry === "-" ||
        expiry.trim() === "") {
      console.log(`⚠️ Невалидная дата срока годности: "${expiry}" - пропускаем создание напоминаний`);
      return;
    }

    const expiryDate = new Date(expiry);
    
    // Проверяем, что дата действительно валидна
    if (isNaN(expiryDate.getTime())) {
      console.log(`⚠️ Невалидная дата срока годности: "${expiry}" - не удалось распарсить дату`);
      return;
    }

    // Запрашиваем разрешение на уведомления
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== "granted") {
        console.log("⚠️ Разрешение на уведомления не предоставлено");
        return;
      }
    }

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
          sound: "default", // Звук по умолчанию
          priority: Notifications.AndroidNotificationPriority.MAX, // Максимальный приоритет
          categoryIdentifier: "medication-expired", // Категория для группировки
          // Android-специфичные настройки для работы при выключенном звуке
          ...(Platform.OS === "android" && {
            vibrate: [0, 250, 250, 250, 250, 250],
            lightColor: "#FF0000",
            sticky: true,
            autoDismiss: false,
          }),
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
          sound: "default", // Звук по умолчанию
          priority: Notifications.AndroidNotificationPriority.MAX, // Максимальный приоритет
          data: { medicineId, type: "expiring_soon" },
          categoryIdentifier: "medication-expiry", // Категория для группировки
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
          date: sevenDaysBefore,
        },
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
          sound: "default", // Звук по умолчанию
          priority: Notifications.AndroidNotificationPriority.MAX, // Максимальный приоритет
          data: { medicineId, type: "expiring_soon" },
          categoryIdentifier: "medication-expiry", // Категория для группировки
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
          date: threeDaysBefore,
        },
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
          sound: "default", // Звук по умолчанию
          priority: Notifications.AndroidNotificationPriority.MAX, // Максимальный приоритет
          data: { medicineId, type: "expiring_tomorrow" },
          categoryIdentifier: "medication-expiry", // Категория для группировки
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
          date: oneDayBefore,
        },
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
          sound: "default", // Звук по умолчанию
          priority: Notifications.AndroidNotificationPriority.MAX, // Максимальный приоритет
          data: { medicineId, type: "expiring_today" },
          categoryIdentifier: "medication-expiry", // Категория для группировки
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
          date: expiryDay,
        },
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
export async function checkExpiryDaily(userId?: number) {
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

    const expired = await getExpiredMedicines(userId);
    const expiringSoon = await getExpiringSoonMedicines(userId);

    // Отправляем уведомления о просроченных
    for (const med of expired) {
      if (!med.expiry) continue; // Guard against null expiry
      // Создаем уведомление о пополнении для просроченного лекарства (это делается первым, чтобы избежать дубликатов)
      if (userId) {
        await createRefillNotification({
          medicineName: med.name,
          dose: med.dose ?? undefined,
          reason: `Срок годности истёк ${med.expiry}. Необходимо приобрести новое лекарство.`,
          reasonType: "expired",
          medicineId: med.id,
          userId: userId,
        });
      }

      // Отправляем push-уведомление
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "⛔ Лекарство просрочено",
          body: `${med.name}${med.dose ? ` (${med.dose})` : ""} - срок годности истёк ${med.expiry}`,
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: { medicineId: med.id, type: "expired" },
          categoryIdentifier: "medication-expired",
          // Android-специфичные настройки для работы при выключенном звуке
          ...(Platform.OS === "android" && {
            vibrate: [0, 250, 250, 250, 250, 250],
            lightColor: "#FF0000",
            sticky: true,
            autoDismiss: false,
          }),
        },
        trigger: null, // сразу
      });
      
      console.log(`🔔 Создано уведомление о пополнении для просроченного лекарства: ${med.name}`);
    }

    // Отправляем уведомления о скоро истекающих
    for (const med of expiringSoon) {
      if (!med.expiry) continue; // Guard against null expiry
      const expiryDate = new Date(med.expiry);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expiryDate.setHours(0, 0, 0, 0);
      
      const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Создаем уведомление о пополнении для истекающего лекарства (это делается первым, чтобы избежать дубликатов)
      if (userId) {
        await createRefillNotification({
          medicineName: med.name,
          dose: med.dose ?? undefined,
          reason: `Срок годности истекает через ${daysLeft} ${daysLeft === 1 ? "день" : daysLeft < 5 ? "дня" : "дней"} (${med.expiry}). Рекомендуется приобрести новое лекарство.`,
          reasonType: "expiring",
          medicineId: med.id,
          userId: userId,
        });
      }

      // Отправляем push-уведомление
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "⚠️ Лекарство скоро истечёт",
          body: `${med.name}${med.dose ? ` (${med.dose})` : ""} - осталось ${daysLeft} ${daysLeft === 1 ? "день" : daysLeft < 5 ? "дня" : "дней"} до ${med.expiry}`,
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: { medicineId: med.id, type: "expiring_soon" },
          categoryIdentifier: "medication-expiry",
          // Android-специфичные настройки для работы при выключенном звуке
          ...(Platform.OS === "android" && {
            vibrate: [0, 250, 250, 250, 250, 250],
            lightColor: "#FF0000",
            sticky: true,
            autoDismiss: false,
          }),
        },
        trigger: null, // сразу
      });
      
      console.log(`🔔 Создано уведомление о пополнении для истекающего лекарства: ${med.name}`);
    }

    return { expired, expiringSoon };
  } catch (e) {
    console.log("checkExpiryDaily error:", e);
    return { expired: [], expiringSoon: [] };
  }
}

// ----------------------------------------------------
// 🧹 ОЧИСТИТЬ НЕВАЛИДНЫЕ PHOTOURI
// ----------------------------------------------------
export async function cleanupInvalidPhotoUris(userId: number): Promise<{ cleaned: number; errors: number }> {
  const db = await getDB();
  let cleaned = 0;
  let errors = 0;

  try {
    const medicines = await db.getAllAsync<import("../types/db").MedicineRow>(
      `SELECT id, photoUri FROM medicines WHERE userId = ? AND photoUri IS NOT NULL AND photoUri != ''`,
      [userId]
    );

    for (const medicine of medicines) {
      if (medicine.photoUri) {
        const photoUri = String(medicine.photoUri).trim();
        
        // Пропускаем URL из интернета
        if (photoUri.startsWith('http://') || photoUri.startsWith('https://')) {
          continue;
        }
        
        // Пропускаем фотографии в постоянной папке
        if (photoUri.includes('medicine_photos/')) {
          continue;
        }
        
        // Проверяем существование файла для локальных путей
        if (photoUri.startsWith('file://') || photoUri.startsWith('content://') || photoUri.startsWith('/')) {
          try {
            const { checkPhotoExists } = await import("../utils/medicine-photo-storage");
            const exists = await checkPhotoExists(photoUri);
            
            if (!exists) {
              // Файл не существует - очищаем photoUri
              await db.runAsync(
                `UPDATE medicines SET photoUri = NULL WHERE id = ?`,
                [medicine.id]
              );
              cleaned++;
              console.log(`🧹 Очищен невалидный photoUri для лекарства ${medicine.id}`);
            }
          } catch (error) {
            console.error(`Ошибка проверки фотографии для лекарства ${medicine.id}:`, error);
            errors++;
          }
        }
      }
    }
  } catch (error) {
    console.error("Ошибка очистки невалидных photoUri:", error);
    errors++;
  }

  return { cleaned, errors };
}

// ----------------------------------------------------
// 🔄 ПЕРЕСОЗДАТЬ НАПОМИНАНИЯ ДЛЯ ВСЕХ ЛЕКАРСТВ
// ----------------------------------------------------
export async function rescheduleAllExpiryNotifications(userId: number) {
  try {
    const medicines = await getAllMedicines(userId) as any[];
    
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

// ----------------------------------------------------
// 🧹 ОЧИСТИТЬ БАЗУ ДАННЫХ ОТ УДАЛЕННЫХ ЛЕКАРСТВ
// ----------------------------------------------------
/**
 * Очищает таблицу deleted_medicines от старых записей
 * @param userId - ID пользователя (опционально, если не указан - очищает для всех)
 * @param daysOld - Удаляет записи старше указанного количества дней (по умолчанию 30)
 * @returns Количество удаленных записей
 */
export async function cleanupDeletedMedicines(userId?: number, daysOld: number = 30): Promise<number> {
  const db = await getDB();
  
  try {
    // Вычисляем дату, старше которой нужно удалить записи
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffDateStr = cutoffDate.toISOString();

    let query: string;
    let params: any[];

    if (userId) {
      // Очищаем для конкретного пользователя
      query = `
        DELETE FROM deleted_medicines 
        WHERE userId = ? AND deletedAt < ?
      `;
      params = [userId, cutoffDateStr];
    } else {
      // Очищаем для всех пользователей
      query = `
        DELETE FROM deleted_medicines 
        WHERE deletedAt < ?
      `;
      params = [cutoffDateStr];
    }

    const result = await db.runAsync(query, params);
    const deletedCount = result.changes || 0;
    
    console.log(`🧹 Очищено ${deletedCount} записей из deleted_medicines (старше ${daysOld} дней)`);
    
    return deletedCount;
  } catch (error) {
    console.error("❌ Ошибка очистки deleted_medicines:", error);
    throw error;
  }
}

/**
 * Очищает все записи из deleted_medicines (использовать с осторожностью!)
 * @param userId - ID пользователя (опционально, если не указан - очищает для всех)
 * @returns Количество удаленных записей
 */
export async function clearAllDeletedMedicines(userId?: number): Promise<number> {
  const db = await getDB();
  
  try {
    let query: string;
    let params: any[];

    if (userId) {
      query = `DELETE FROM deleted_medicines WHERE userId = ?`;
      params = [userId];
    } else {
      query = `DELETE FROM deleted_medicines`;
      params = [];
    }

    const result = await db.runAsync(query, params);
    const deletedCount = result.changes || 0;
    
    console.log(`🧹 Очищено ${deletedCount} записей из deleted_medicines`);
    
    return deletedCount;
  } catch (error) {
    console.error("❌ Ошибка очистки deleted_medicines:", error);
    throw error;
  }
}
