// 📌 ФАЙЛ: src/services/family.service.ts
import { getDB } from "../database/medicine.database";

// Создать
export async function saveFamilyMember(member: {
  name: string;
  role?: string | null;
  birthdate?: string | null;
  allergies?: string | null;
  photoUri?: string | null;
}) {
  const db = await getDB();

  await db.runAsync(
    `INSERT INTO family (name, role, birthdate, allergies, photoUri, createdAt)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    [
      member.name,
      member.role ?? null,
      member.birthdate ?? null,
      member.allergies ?? null,
      member.photoUri ?? null,
    ]
  );
}

// Получить всех
export async function getAllFamilyMembers() {
  const db = await getDB();
  return await db.getAllAsync(`SELECT * FROM family ORDER BY createdAt DESC`);
}

// Получить одного
export async function getFamilyMemberById(id: number) {
  const db = await getDB();
  return await db.getFirstAsync(`SELECT * FROM family WHERE id = ?`, [id]);
}


// Обновить
export async function updateFamilyMember(
  id: number,
  data: {
    name: string;
    role?: string | null;
    birthdate?: string | null;
    allergies?: string | null;
    photoUri?: string | null;
  }
) {
  const db = await getDB();

  await db.runAsync(
    `UPDATE family
     SET name=?, role=?, birthdate=?, allergies=?, photoUri=?
     WHERE id=?`,
    [
      data.name,
      data.role ?? null,
      data.birthdate ?? null,
      data.allergies ?? null,
      data.photoUri ?? null,
      id,
    ]
  );
}

// Удалить
export async function deleteFamilyMember(id: number) {
  const db = await getDB();
  await db.runAsync(`DELETE FROM family WHERE id=?`, [id]);
}

