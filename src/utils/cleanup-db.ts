/**
 * Утилита для очистки базы данных от удаленных лекарств
 * 
 * Использование:
 * import { cleanupDeletedMedicines, clearAllDeletedMedicines } from '../utils/cleanup-db';
 * 
 * // Очистить записи старше 30 дней для текущего пользователя
 * await cleanupDeletedMedicines(userId);
 * 
 * // Очистить все записи для текущего пользователя
 * await clearAllDeletedMedicines(userId);
 */

import { cleanupDeletedMedicines as cleanupDeleted, clearAllDeletedMedicines as clearAllDeleted } from '../database/medicine.service';
import { useAuthStore } from '../store/authStore';

/**
 * Очищает старые записи из deleted_medicines для текущего пользователя
 * @param daysOld - Удаляет записи старше указанного количества дней (по умолчанию 30)
 */
export async function cleanupDeletedMedicines(daysOld: number = 30): Promise<number> {
  const user = useAuthStore.getState().user;
  
  if (!user?.id) {
    throw new Error("Пользователь не найден");
  }

  return await cleanupDeleted(user.id, daysOld);
}

/**
 * Очищает все записи из deleted_medicines для текущего пользователя
 * ⚠️ ВНИМАНИЕ: Это удалит все записи об удаленных лекарствах!
 * После этого удаленные лекарства могут восстановиться при синхронизации с сервером.
 */
export async function clearAllDeletedMedicines(): Promise<number> {
  const user = useAuthStore.getState().user;
  
  if (!user?.id) {
    throw new Error("Пользователь не найден");
  }

  return await clearAllDeleted(user.id);
}

