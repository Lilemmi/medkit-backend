// Используем простую проверку сети через fetch
import { 
  getMedicinesApi, 
  createMedicineApi, 
  updateMedicineApi, 
  deleteMedicineApi,
  type Medicine 
} from "../api/medicines";
import { 
  getAllMedicines, 
  saveMedicine, 
  deleteMedicine 
} from "../database/medicine.service";
import { getDB } from "../database/medicine.database";

export interface SyncResult {
  success: boolean;
  synced: number;
  errors: number;
  message?: string;
}

/**
 * Проверяет доступность сети
 */
export async function isOnline(): Promise<boolean> {
  try {
    // Пытаемся сделать простой запрос к серверу API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    try {
      const response = await fetch("https://www.google.com", {
        method: "HEAD",
        mode: "no-cors",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      clearTimeout(timeoutId);
      // Если это не ошибка отмены, значит сети нет
      if (error.name !== "AbortError") {
        return false;
      }
      // Если таймаут - считаем что сети нет
      return false;
    }
  } catch (error) {
    console.log("Network check error:", error);
    return false;
  }
}

/**
 * Синхронизирует локальные лекарства с сервером
 * Отправляет все локальные изменения на сервер
 */
export async function syncLocalToServer(userId: number): Promise<SyncResult> {
  const online = await isOnline();
  if (!online) {
    return {
      success: false,
      synced: 0,
      errors: 0,
      message: "Нет подключения к интернету",
    };
  }

  try {
    // Получаем все локальные лекарства
    const localMedicines = await getAllMedicines(userId);
    
    let synced = 0;
    let errors = 0;

    // Синхронизируем каждое лекарство
    for (const medicine of localMedicines) {
      try {
        // Если у лекарства нет serverId, значит оно еще не синхронизировано
        // В этом случае создаем его на сервере
        if (!medicine.serverId) {
          const serverMedicine = await createMedicineApi(userId, {
            name: medicine.name,
            dose: medicine.dose,
            form: medicine.form,
            expiry: medicine.expiry,
            photoUri: medicine.photoUri,
          });

          // Обновляем локальную запись с serverId
          if (serverMedicine.id) {
            const db = await getDB();
            await db.runAsync(
              `UPDATE medicines SET serverId = ?, syncedAt = datetime('now') WHERE id = ?`,
              [serverMedicine.id, medicine.id]
            );
            synced++;
          }
        } else {
          // Если есть serverId, проверяем, нужно ли обновить
          // (можно добавить проверку по updatedAt)
          synced++;
        }
      } catch (error) {
        console.error(`Error syncing medicine ${medicine.id}:`, error);
        errors++;
      }
    }

    return {
      success: errors === 0,
      synced,
      errors,
      message: `Синхронизировано: ${synced}, ошибок: ${errors}`,
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
  const online = await isOnline();
  if (!online) {
    return {
      success: false,
      synced: 0,
      errors: 0,
      message: "Нет подключения к интернету",
    };
  }

  try {
    // Получаем все лекарства с сервера
    const serverMedicines = await getMedicinesApi(userId);
    
    // Получаем локальные лекарства
    const localMedicines = await getAllMedicines(userId);
    
    // Создаем карту локальных лекарств по serverId
    const localMap = new Map<number, any>();
    localMedicines.forEach((med) => {
      if (med.serverId) {
        localMap.set(med.serverId, med);
      }
    });

    let synced = 0;
    let errors = 0;

    // Синхронизируем каждое лекарство с сервера
    for (const serverMedicine of serverMedicines) {
      try {
        const localMedicine = localMap.get(serverMedicine.id!);

        if (!localMedicine) {
          // Лекарство есть на сервере, но нет локально - создаем
          await saveMedicine({
            name: serverMedicine.name,
            dose: serverMedicine.dose,
            form: serverMedicine.form,
            expiry: serverMedicine.expiry,
            photoUri: serverMedicine.photoUri,
            userId,
            serverId: serverMedicine.id,
          });
          synced++;
        } else {
          // Лекарство есть и там, и там - обновляем локальное, если нужно
          // Можно добавить проверку по updatedAt для оптимизации
          const needsUpdate = 
            localMedicine.name !== serverMedicine.name ||
            localMedicine.dose !== serverMedicine.dose ||
            localMedicine.form !== serverMedicine.form ||
            localMedicine.expiry !== serverMedicine.expiry ||
            localMedicine.photoUri !== serverMedicine.photoUri;

          if (needsUpdate) {
            const db = await getDB();
            await db.runAsync(
              `UPDATE medicines SET name = ?, dose = ?, form = ?, expiry = ?, photoUri = ?, syncedAt = datetime('now') WHERE id = ?`,
              [
                serverMedicine.name,
                serverMedicine.dose,
                serverMedicine.form,
                serverMedicine.expiry,
                serverMedicine.photoUri,
                localMedicine.id,
              ]
            );
            synced++;
          }
        }
      } catch (error) {
        console.error(`Error syncing medicine ${serverMedicine.id}:`, error);
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
          await deleteMedicine(localMedicine.id);
          synced++;
        }
      }
    }

    return {
      success: errors === 0,
      synced,
      errors,
      message: `Загружено с сервера: ${synced}, ошибок: ${errors}`,
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

  return {
    success: serverResult.success && localResult.success,
    synced: serverResult.synced + localResult.synced,
    errors: serverResult.errors + localResult.errors,
    message: `Синхронизация завершена. Загружено: ${serverResult.synced}, Отправлено: ${localResult.synced}`,
  };
}


