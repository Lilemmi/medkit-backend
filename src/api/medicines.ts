import { api } from "./api";

export interface Medicine {
  id?: number;
  name?: string;
  dose?: string;
  form?: string;
  expiry?: string;
  photoUri?: string;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
  
  // Параметры приема лекарства
  takeWithFood?: string;
  takeWithLiquid?: string;
  incompatibleMedicines?: any; // JSON
  compatibleMedicines?: any; // JSON
  forbiddenFoods?: any; // JSON
  recommendedFoods?: any; // JSON
  alcoholInteraction?: string;
  caffeineInteraction?: string;
  storageConditions?: string;
  specialInstructions?: string;
  sideEffects?: string;
  contraindications?: string;
  
  // Количество и учет
  quantity?: number;
  totalPills?: number;
  usedPills?: number;
  pillsPerDose?: number;
  lowStockThreshold?: number;
  familyMemberId?: number;
  userDosage?: string;
  
  // Расширенная информация о лекарстве
  internationalName?: string;
  manufacturer?: string;
  packageVolume?: string;
  category?: string;
  activeIngredients?: any; // JSON
  indications?: any; // JSON
  contraindicationsDetailed?: any; // JSON
  warnings?: any; // JSON
  foodCompatibility?: any; // JSON
  drugCompatibility?: any; // JSON
  dosageDetailed?: any; // JSON
  childrenRestrictions?: any; // JSON
  sideEffectsDetailed?: any; // JSON
  storageConditionsDetailed?: any; // JSON
  additionalRecommendations?: any; // JSON
  specialGroupsInfo?: any; // JSON
  analogs?: any; // JSON
}

export interface InventoryHistory {
  id: number;
  userId: number;
  medicineId?: number;
  action: string;
  oldData?: any;
  newData?: any;
  description?: string;
  createdAt: string;
  medicine?: Medicine;
}

// Получить все лекарства пользователя
// userId теперь берется из JWT токена, параметр оставлен для обратной совместимости
export async function getMedicinesApi(userId?: number): Promise<Medicine[]> {
  try {
    // Пробуем новый формат (без userId в URL)
    const response = await api.get(`/medicines`);
    return response.data;
  } catch (error: any) {
    // Если 404, пробуем старый формат для обратной совместимости
    if (error.response?.status === 404 && userId) {
      console.log("⚠️ Новый маршрут не найден, пробуем старый формат...");
      try {
        const response = await api.get(`/medicines/${userId}`);
        return response.data;
      } catch (fallbackError) {
        // Если и старый формат не работает, пробрасываем оригинальную ошибку
        throw error;
      }
    }
    throw error;
  }
}

// Создать лекарство
// userId теперь берется из JWT токена, параметр оставлен для обратной совместимости
export async function createMedicineApi(
  userId: number,
  medicine: Omit<Medicine, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<Medicine> {
  const response = await api.post(`/medicines`, medicine);
  return response.data;
}

// Обновить лекарство
// userId теперь берется из JWT токена, параметр оставлен для обратной совместимости
export async function updateMedicineApi(
  userId: number,
  id: number,
  medicine: Partial<Medicine>
): Promise<Medicine> {
  const response = await api.put(`/medicines/${id}`, medicine);
  return response.data;
}

// Удалить лекарство
// userId теперь берется из JWT токена, параметр оставлен для обратной совместимости
export async function deleteMedicineApi(
  userId: number,
  id: number
): Promise<void> {
  await api.delete(`/medicines/${id}`);
}

// Получить просроченные лекарства
// userId теперь берется из JWT токена, параметр оставлен для обратной совместимости
export async function getExpiredMedicinesApi(
  userId: number
): Promise<Medicine[]> {
  const response = await api.get(`/medicines/expired`);
  return response.data;
}

// Получить лекарства, которые скоро истекают
// userId теперь берется из JWT токена, параметр оставлен для обратной совместимости
export async function getExpiringSoonMedicinesApi(
  userId: number
): Promise<Medicine[]> {
  const response = await api.get(`/medicines/soon`);
  return response.data;
}

// Получить историю инвентаризации
// userId теперь берется из JWT токена, параметр оставлен для обратной совместимости
export async function getInventoryHistoryApi(
  userId: number
): Promise<InventoryHistory[]> {
  const response = await api.get(`/medicines/history`);
  return response.data;
}

// Получить историю конкретного лекарства
// userId теперь берется из JWT токена, параметр оставлен для обратной совместимости
export async function getMedicineHistoryApi(
  userId: number,
  medicineId: number
): Promise<InventoryHistory[]> {
  const response = await api.get(`/medicines/history/${medicineId}`);
  return response.data;
}









