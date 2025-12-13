import { getHealthDB } from "./health.database";

export interface Doctor {
  id?: number;
  userId: number;
  name: string;
  specialty?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Сохранить врача
export async function saveDoctor(doctor: Doctor): Promise<number> {
  const db = await getHealthDB();

  if (!doctor.userId) {
    throw new Error("userId is required to save doctor");
  }
  
  if (doctor.id) {
    // Обновление существующего врача
    await db.runAsync(
      `UPDATE doctors 
       SET name = ?, specialty = ?, phone = ?, email = ?, address = ?, notes = ?, updatedAt = datetime('now')
       WHERE id = ? AND userId = ?`,
      [
        doctor.name,
        doctor.specialty || null,
        doctor.phone || null,
        doctor.email || null,
        doctor.address || null,
        doctor.notes || null,
        doctor.id,
        doctor.userId,
      ]
    );
    return doctor.id;
  } else {
    // Создание нового врача
    const result = await db.runAsync(
      `INSERT INTO doctors (userId, name, specialty, phone, email, address, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        doctor.userId,
        doctor.name,
        doctor.specialty || null,
        doctor.phone || null,
        doctor.email || null,
        doctor.address || null,
        doctor.notes || null,
      ]
    );
    if (result.lastInsertRowId == null) {
      throw new Error("Failed to insert doctor");
    }
    return result.lastInsertRowId;
  }
}

// Получить всех врачей
export async function getDoctors(userId?: number): Promise<Doctor[]> {
  const db = await getHealthDB();
  const query = userId
    ? `SELECT * FROM doctors WHERE userId = ? ORDER BY name ASC`
    : `SELECT * FROM doctors ORDER BY name ASC`;
  const params = userId ? [userId] : [];
  return await db.getAllAsync<Doctor>(query, params);
}

// Получить врача по ID
export async function getDoctorById(id: number, userId?: number): Promise<Doctor | null> {
  const db = await getHealthDB();
  const query = userId
    ? `SELECT * FROM doctors WHERE id = ? AND userId = ?`
    : `SELECT * FROM doctors WHERE id = ?`;
  const params = userId ? [id, userId] : [id];
  return await db.getFirstAsync<Doctor>(query, params);
}

// Удалить врача
export async function deleteDoctor(id: number, userId?: number): Promise<void> {
  const db = await getHealthDB();
  const query = userId
    ? `DELETE FROM doctors WHERE id = ? AND userId = ?`
    : `DELETE FROM doctors WHERE id = ?`;
  const params = userId ? [id, userId] : [id];
  await db.runAsync(query, params);
}

