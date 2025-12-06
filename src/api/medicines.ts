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
export async function getMedicinesApi(userId: number): Promise<Medicine[]> {
  const response = await api.get(`/medicines/${userId}`);
  return response.data;
}

// Создать лекарство
export async function createMedicineApi(
  userId: number,
  medicine: Omit<Medicine, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<Medicine> {
  const response = await api.post(`/medicines/${userId}`, medicine);
  return response.data;
}

// Обновить лекарство
export async function updateMedicineApi(
  userId: number,
  id: number,
  medicine: Partial<Medicine>
): Promise<Medicine> {
  const response = await api.put(`/medicines/${userId}/${id}`, medicine);
  return response.data;
}

// Удалить лекарство
export async function deleteMedicineApi(
  userId: number,
  id: number
): Promise<void> {
  await api.delete(`/medicines/${userId}/${id}`);
}

// Получить просроченные лекарства
export async function getExpiredMedicinesApi(
  userId: number
): Promise<Medicine[]> {
  const response = await api.get(`/medicines/${userId}/expired`);
  return response.data;
}

// Получить лекарства, которые скоро истекают
export async function getExpiringSoonMedicinesApi(
  userId: number
): Promise<Medicine[]> {
  const response = await api.get(`/medicines/${userId}/soon`);
  return response.data;
}

// Получить историю инвентаризации
export async function getInventoryHistoryApi(
  userId: number
): Promise<InventoryHistory[]> {
  const response = await api.get(`/medicines/${userId}/history`);
  return response.data;
}

// Получить историю конкретного лекарства
export async function getMedicineHistoryApi(
  userId: number,
  medicineId: number
): Promise<InventoryHistory[]> {
  const response = await api.get(`/medicines/${userId}/history/${medicineId}`);
  return response.data;
}



