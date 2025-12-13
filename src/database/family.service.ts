import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

// -----------------------------------------
// 📌 Открыть или создать базу данных
// -----------------------------------------
export async function getFamilyDB() {
  if (db) return db;

  db = await SQLite.openDatabaseAsync("family.db");

  // Создаём таблицу, если не существует
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS family (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT,
      birthdate TEXT,
      allergies TEXT,
      photoUri TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );
  `);

  return db;
}
