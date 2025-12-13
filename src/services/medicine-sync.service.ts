// Используем простую проверку сети через fetch
import { 
  getMedicinesApi, 
  createMedicineApi, 
  updateMedicineApi, 
  deleteMedicineApi,
  type Medicine 
} from "../api/medicines";
import { getDB } from "../database/medicine.database";
import { isOnline as checkOnline } from "../utils/network";

// Локная модель лекарства — используется для приведения типов
interface LocalMedicine {
  id: number;
  userId?: number;
  serverId?: number | null;
  name?: string | null;
  dose?: string | null;
  form?: string | null;
  expiry?: string | null;
  photoUri?: string | null;
  syncedAt?: string | null;
}

// Реэкспорт для обратной совместимости
export async function isOnline(): Promise<boolean> {
  return checkOnline();
}

export interface SyncResult {
  success: boolean;
  synced: number;
  errors: number;
  message?: string;
}

/**
 * Синхронизирует локальные лекарства с сервером
 * Отправляет все локальные изменения на сервер
 */
export async function syncLocalToServer(userId: number): Promise<SyncResult> {
  const online = await checkOnline();
  if (!online) {
    return {
      success: false,
      synced: 0,
      errors: 0,
      message: "Нет подключения к интернету",
    };
  }

  try {
    // Ленивый импорт для избежания циклической зависимости
    const { getAllMedicines } = await import("../database/medicine.service");
    
    // Получаем все локальные лекарства
    const localMedicines = await getAllMedicines(userId) as LocalMedicine[];
    
    console.log(`📦 Найдено ${localMedicines.length} локальных лекарств для синхронизации`);
    
    let synced = 0;
    let errors = 0;
    let skipped = 0; // Уже синхронизированные

    // Синхронизируем каждое лекарство
    for (const medicine of localMedicines) {
      try {
        // Если у лекарства нет serverId, значит оно еще не синхронизировано
        // В этом случае создаем его на сервере
        if (!medicine.serverId) {
          console.log(`📤 Синхронизация лекарства "${medicine.name}" (id: ${medicine.id})...`);
          
          // Валидация и очистка данных перед отправкой на сервер
          const isValidExpiry = medicine.expiry && 
                                medicine.expiry !== "Not visible" && 
                                medicine.expiry !== "—" && 
                                medicine.expiry !== "-" &&
                                medicine.expiry.trim() !== "";
          
          // Проверяем, что дата валидна
          let cleanExpiry: string | undefined = undefined;
          if (isValidExpiry && typeof medicine.expiry === "string") {
            const expiryDate = new Date(medicine.expiry);
            if (!isNaN(expiryDate.getTime())) {
              cleanExpiry = medicine.expiry;
            } else {
              console.log(`⚠️ Невалидная дата "${medicine.expiry}" для лекарства "${medicine.name}" - отправляем null`);
            }
          }
          
          // НЕ синхронизируем локальные пути к фотографиям на сервер
          // Локальные пути (file://, content://) специфичны для каждого устройства
          // Синхронизируем только URL из интернета (http://, https://)
          let photoUriToSync = null;
          if (medicine.photoUri && 
              (medicine.photoUri.startsWith('http://') || medicine.photoUri.startsWith('https://'))) {
            photoUriToSync = medicine.photoUri;
          }
          
          const medicineData = {
            name: medicine.name || "",
            dose: medicine.dose ?? undefined,
            form: medicine.form ?? undefined,
            expiry: cleanExpiry ?? undefined,
            photoUri: photoUriToSync ?? undefined,
          };
          
          console.log(`📋 Данные для отправки:`, JSON.stringify(medicineData, null, 2));
          
          const serverMedicine = await createMedicineApi(userId, medicineData);

          // Обновляем локальную запись с serverId
          if (serverMedicine.id) {
            const db = await getDB();
            await db.runAsync(
              `UPDATE medicines SET serverId = ?, syncedAt = datetime('now') WHERE id = ?`,
              [serverMedicine.id, medicine.id]
            );
            synced++;
            console.log(`✅ Лекарство "${medicine.name}" синхронизировано (serverId: ${serverMedicine.id})`);
          }
        } else {
          // Если есть serverId, лекарство уже синхронизировано
          skipped++;
        }
      } catch (error: any) {
        // Тихая обработка ошибок синхронизации - не засоряем консоль
        const errorMessage = error?.response?.data?.message || error?.message || "Unknown error";
        const statusCode = error?.response?.status;
        
        // Логируем только важные ошибки (не 500, которые обычно временные)
        if (statusCode && statusCode !== 500) {
          console.log(`⚠️ Ошибка синхронизации лекарства ${medicine.id} (${statusCode}): ${errorMessage}`);
        } else if (statusCode === 500) {
          console.log(`⚠️ Ошибка сервера (500) при синхронизации лекарства "${medicine.name}" (id: ${medicine.id})`);
        }
        errors++;
      }
    }

    const message = errors > 0 
      ? `Синхронизировано: ${synced}, пропущено: ${skipped}, ошибок: ${errors}`
      : `Синхронизировано: ${synced}, пропущено: ${skipped}`;

    return {
      success: errors === 0,
      synced,
      errors,
      message,
    };
  } catch (error) {
    console.error("Sync local to server error:", error);
    return {
      success: false,
      synced: 0,
      errors: 1,
      message: error instanceof Error ? error.message : "Ошибка синхронизации",
    };
  }
}

/**
 * Синхронизирует данные с сервера в локальную БД
 * Загружает все лекарства с сервера и обновляет локальную БД
 */
export async function syncServerToLocal(userId: number): Promise<SyncResult> {
  const online = await checkOnline();
  if (!online) {
    return {
      success: false,
      synced: 0,
      errors: 0,
      message: "Нет подключения к интернету",
    };
  }

  try {
    // Ленивый импорт для избежания циклической зависимости
    const { getAllMedicines, saveMedicine, deleteMedicine } = await import("../database/medicine.service");
    
    // Получаем все лекарства с сервера
    const serverMedicines = await getMedicinesApi(userId);
    console.log(`📥 Получено ${serverMedicines.length} лекарств с сервера`);
    
    // Получаем локальные лекарства
    const localMedicines = await getAllMedicines(userId) as LocalMedicine[];
    console.log(`📦 Найдено ${localMedicines.length} локальных лекарств`);
    
    // Создаем карту локальных лекарств по serverId
    const localMap = new Map<number, any>();
    localMedicines.forEach((med) => {
      if (med.serverId) {
        localMap.set(med.serverId, med);
      }
    });

    let synced = 0;
    let errors = 0;

    // Получаем список удаленных лекарств (serverId), чтобы не восстанавливать их
    const db = await getDB();
    const deletedMedicines = await db.getAllAsync<{ serverId: number }>(
      `SELECT serverId FROM deleted_medicines WHERE userId = ?`,
      [userId]
    );
    const deletedServerIds = new Set(deletedMedicines.map(d => d.serverId));

    // Сначала удаляем с сервера лекарства, которые были удалены локально
    // но все еще существуют на сервере
    let deletedFromServer = 0;
    let failedToDelete = 0;
    
    for (const serverMedicine of serverMedicines) {
      if (deletedServerIds.has(serverMedicine.id!)) {
        try {
          // Пытаемся удалить с сервера
          await deleteMedicineApi(userId, serverMedicine.id!);
          deletedFromServer++;
          
          // Удаляем запись из deleted_medicines, так как теперь оно удалено и на сервере
          await db.runAsync(
            `DELETE FROM deleted_medicines WHERE serverId = ? AND userId = ?`,
            [serverMedicine.id!, userId]
          );
        } catch (error: any) {
          // Если не удалось удалить с сервера
          const statusCode = error?.response?.status;
          
          if (statusCode === 404) {
            // Лекарство уже удалено с сервера - удаляем из deleted_medicines
            await db.runAsync(
              `DELETE FROM deleted_medicines WHERE serverId = ? AND userId = ?`,
              [serverMedicine.id!, userId]
            );
            deletedFromServer++;
          } else if (statusCode === 500) {
            // Ошибка сервера - тихо игнорируем, оставляем в deleted_medicines
            // Запись останется для следующей попытки, но не засоряем консоль
            failedToDelete++;
          } else {
            // Другие ошибки - логируем только если не 500
            console.log(`⚠️ Не удалось удалить с сервера (serverId: ${serverMedicine.id}, статус: ${statusCode})`);
            failedToDelete++;
          }
        }
      }
    }
    
    // Логируем итоги удаления
    if (deletedFromServer > 0) {
      console.log(`🗑️ Удалено с сервера ${deletedFromServer} лекарств, которые были удалены локально`);
    }
    if (failedToDelete > 0) {
      console.log(`⚠️ Не удалось удалить с сервера ${failedToDelete} лекарств (ошибка сервера)`);
    }

    // Синхронизируем каждое лекарство с сервера
    for (const serverMedicine of serverMedicines) {
      try {
        // Пропускаем лекарства, которые были удалены локально
        // (они уже обработаны выше, но на всякий случай проверяем еще раз)
        if (deletedServerIds.has(serverMedicine.id!)) {
          continue;
        }

        const localMedicine = localMap.get(serverMedicine.id!);

        if (!localMedicine) {
          // Лекарство есть на сервере, но нет локально - создаем
          // НЕ используем photoUri с сервера, если это локальный путь (file://, content://)
          // Используем только URL из интернета (http://, https://)
          let photoUriToUse = null;
          if (serverMedicine.photoUri && 
              (serverMedicine.photoUri.startsWith('http://') || serverMedicine.photoUri.startsWith('https://'))) {
            photoUriToUse = serverMedicine.photoUri;
          }
          
          await saveMedicine({
            name: serverMedicine.name,
            dose: serverMedicine.dose,
            form: serverMedicine.form,
            expiry: serverMedicine.expiry,
            photoUri: photoUriToUse,
            userId,
            serverId: serverMedicine.id,
          } as any);
          synced++;
        } else {
          // Лекарство есть и там, и там - обновляем локальное, если нужно
          // НЕ обновляем photoUri, если это локальный путь с сервера
          // Сохраняем локальный photoUri, если он существует
          let photoUriToUpdate = localMedicine.photoUri; // Сохраняем локальный photoUri по умолчанию
          if (serverMedicine.photoUri && 
              (serverMedicine.photoUri.startsWith('http://') || serverMedicine.photoUri.startsWith('https://'))) {
            // Обновляем только если это URL из интернета
            photoUriToUpdate = serverMedicine.photoUri;
          }
          
          const needsUpdate = 
            localMedicine.name !== serverMedicine.name ||
            localMedicine.dose !== serverMedicine.dose ||
            localMedicine.form !== serverMedicine.form ||
            localMedicine.expiry !== serverMedicine.expiry ||
            (photoUriToUpdate !== localMedicine.photoUri);

          if (needsUpdate) {
            const db = await getDB();
            await db.runAsync(
              `UPDATE medicines SET name = ?, dose = ?, form = ?, expiry = ?, photoUri = ?, syncedAt = datetime('now') WHERE id = ?`,
              [
                serverMedicine.name,
                serverMedicine.dose,
                serverMedicine.form,
                serverMedicine.expiry,
                photoUriToUpdate,
                localMedicine.id,
              ]
            );
            synced++;
          }
        }
      } catch (error: any) {
        // Тихая обработка ошибок синхронизации - не засоряем консоль
        const errorMessage = error?.response?.data?.message || error?.message || "Unknown error";
        const statusCode = error?.response?.status;
        
        // Логируем только важные ошибки (не 500, которые обычно временные)
        if (statusCode && statusCode !== 500) {
          console.log(`⚠️ Ошибка загрузки лекарства ${serverMedicine.id} (${statusCode}): ${errorMessage}`);
        }
        errors++;
      }
    }

    // Удаляем локальные лекарства, которых нет на сервере
    // (только если они были синхронизированы ранее)
    for (const localMedicine of localMedicines) {
      if (localMedicine.serverId) {
        const existsOnServer = serverMedicines.some(
          (sm) => sm.id === localMedicine.serverId
        );
        if (!existsOnServer) {
          // Пропускаем лекарства, которые уже были удалены локально
          if (!deletedServerIds.has(localMedicine.serverId)) {
            try {
              await deleteMedicine(localMedicine.id, userId);
              synced++;
            } catch (error: any) {
              // Игнорируем ошибки "Лекарство не найдено" - оно уже удалено
              if (!error?.message?.includes("не найдено")) {
                console.log(`⚠️ Ошибка удаления лекарства ${localMedicine.id}:`, error.message);
                errors++;
              }
            }
          }
        }
      }
    }

    const message = errors > 0
      ? `Загружено с сервера: ${synced}, ошибок: ${errors}`
      : `Загружено с сервера: ${synced}`;
    
    if (synced > 0 || errors > 0) {
      console.log(`📥 Синхронизация с сервера: ${synced} обновлено, ${errors} ошибок`);
    }

    return {
      success: errors === 0,
      synced,
      errors,
      message,
    };
  } catch (error) {
    console.error("Sync server to local error:", error);
    return {
      success: false,
      synced: 0,
      errors: 1,
      message: error instanceof Error ? error.message : "Ошибка синхронизации",
    };
  }
}

/**
 * Полная синхронизация: сначала загружаем с сервера, потом отправляем локальные изменения
 */
export async function fullSync(userId: number): Promise<SyncResult> {
  console.log("🔄 Начало полной синхронизации...");

  // 1. Загружаем данные с сервера
  const serverResult = await syncServerToLocal(userId);
  console.log("📥 Загрузка с сервера:", serverResult.message);

  // 2. Отправляем локальные изменения
  const localResult = await syncLocalToServer(userId);
  console.log("📤 Отправка на сервер:", localResult.message);

  // 3. Очищаем невалидные photoUri после синхронизации
  try {
    const { cleanupInvalidPhotoUris } = await import("../database/medicine.service");
    const cleanupResult = await cleanupInvalidPhotoUris(userId);
    if (cleanupResult.cleaned > 0) {
      console.log(`🧹 Очищено ${cleanupResult.cleaned} невалидных photoUri после синхронизации`);
    }
  } catch (error) {
    console.error("⚠️ Ошибка очистки невалидных photoUri:", error);
    // Не прерываем синхронизацию из-за ошибки очистки
  }

  return {
    success: serverResult.success && localResult.success,
    synced: serverResult.synced + localResult.synced,
    errors: serverResult.errors + localResult.errors,
    message: `Синхронизация завершена. Загружено: ${serverResult.synced}, Отправлено: ${localResult.synced}`,
  };
}


