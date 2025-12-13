// 📌 ФАЙЛ: src/services/family.service.ts
import { getDB } from "../database/medicine.database";

// Создать
export async function saveFamilyMember(member: {
  name: string;
  role?: string | null;
  birthdate?: string | null; // Старое поле для совместимости
  birthDate?: string | null; // Новое поле в формате YYYY-MM-DD
  gender?: string | null;
  allergies?: string | null;
  photoUri?: string | null;
  weight?: number | null;
  height?: number | null;
  chronicDiseases?: string[] | null;
  medicalConditions?: string[] | null;
  organConditions?: string[] | null;
}) {
  const db = await getDB();

  // Используем birthDate если есть, иначе birthdate для обратной совместимости
  const finalBirthDate = member.birthDate || member.birthdate || null;

  await db.runAsync(
    `INSERT INTO family (
      name, role, birthdate, birthDate, gender, allergies, photoUri,
      weight, height, chronicDiseases, medicalConditions, organConditions,
      createdAt
    )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      member.name,
      member.role ?? null,
      finalBirthDate, // Старое поле для обратной совместимости
      finalBirthDate, // Новое поле
      member.gender ?? null,
      member.allergies ?? null,
      member.photoUri ?? null,
      member.weight ?? null,
      member.height ?? null,
      member.chronicDiseases ? JSON.stringify(member.chronicDiseases) : null,
      member.medicalConditions ? JSON.stringify(member.medicalConditions) : null,
      member.organConditions ? JSON.stringify(member.organConditions) : null,
    ]
  );
}

// Получить всех
export async function getAllFamilyMembers() {
  const db = await getDB();
  const members = await db.getAllAsync<import("../types/db").FamilyMember>(`SELECT * FROM family ORDER BY createdAt DESC`);
  
  // Парсим JSON поля
  return members.map((member: any) => {
    try {
      return {
        ...member,
        chronicDiseases: member.chronicDiseases ? JSON.parse(member.chronicDiseases) : null,
        medicalConditions: member.medicalConditions ? JSON.parse(member.medicalConditions) : null,
        organConditions: member.organConditions ? JSON.parse(member.organConditions) : null,
      };
    } catch (e) {
      // Если ошибка парсинга, возвращаем как есть
      return member;
    }
  });
}

// Получить одного
export async function getFamilyMemberById(id: number) {
  const db = await getDB();
  const member = await db.getFirstAsync<import("../types/db").FamilyMember | null>(`SELECT * FROM family WHERE id = ?`, [id]);
  
  if (!member) return null;
  
  // Парсим JSON поля
  try {
    return {
      ...member,
      chronicDiseases: member.chronicDiseases ? JSON.parse(member.chronicDiseases) : null,
      medicalConditions: member.medicalConditions ? JSON.parse(member.medicalConditions) : null,
      organConditions: member.organConditions ? JSON.parse(member.organConditions) : null,
    };
  } catch (e) {
    return member;
  }
}


// Обновить
export async function updateFamilyMember(
  id: number,
  data: {
    name: string;
    role?: string | null;
    birthdate?: string | null;
    birthDate?: string | null;
    gender?: string | null;
    allergies?: string | null;
    photoUri?: string | null;
    weight?: number | null;
    height?: number | null;
    chronicDiseases?: string[] | null;
    medicalConditions?: string[] | null;
    organConditions?: string[] | null;
  }
) {
  const db = await getDB();

  const finalBirthDate = data.birthDate || data.birthdate || null;

  await db.runAsync(
    `UPDATE family
     SET name=?, role=?, birthdate=?, birthDate=?, gender=?, allergies=?, photoUri=?,
         weight=?, height=?, chronicDiseases=?, medicalConditions=?, organConditions=?
     WHERE id=?`,
    [
      data.name,
      data.role ?? null,
      finalBirthDate, // Старое поле
      finalBirthDate, // Новое поле
      data.gender ?? null,
      data.allergies ?? null,
      data.photoUri ?? null,
      data.weight ?? null,
      data.height ?? null,
      data.chronicDiseases ? JSON.stringify(data.chronicDiseases) : null,
      data.medicalConditions ? JSON.stringify(data.medicalConditions) : null,
      data.organConditions ? JSON.stringify(data.organConditions) : null,
      id,
    ]
  );
}

// Удалить
export async function deleteFamilyMember(id: number) {
  const db = await getDB();
  await db.runAsync(`DELETE FROM family WHERE id=?`, [id]);
}

