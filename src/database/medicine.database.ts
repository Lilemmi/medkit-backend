// 📌 ФАЙЛ: src/database/medicine.database.ts

import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

let db: SQLiteDatabase | null = null;

// ----------------------------------------------------
// 📌 Получить соединение с одной БАЗОЙ: medkit.db
// ----------------------------------------------------
export async function getDB() {
  if (!db) {
    db = await openDatabaseAsync("medkit.db");
  }
  return db;
}

// ----------------------------------------------------
// 📌 Функция: добавить колонку если нет
// ----------------------------------------------------
async function addColumnIfNotExists(table: string, column: string, type: string) {
  const database = await getDB();

  const info = await database.getAllAsync(`PRAGMA table_info(${table});`);
  const exists = info.some((c) => c.name === column);

  if (!exists) {
    await database.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
    console.log(`🛠 Добавлена колонка "${column}" в таблицу "${table}"`);
  }
}

// ----------------------------------------------------
// 📌 Инициализация ВСЕХ таблиц
// ----------------------------------------------------
export async function initDB() {
  const database = await getDB();

  console.log("📦 Init DB…");
  
  // Инициализируем также базу данных здоровья
  const { getHealthDB } = await import("./health.database");
  await getHealthDB();

  // ------------------------------------
  // 🟦 Таблица лекарств
  // ------------------------------------
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      dose TEXT,
      form TEXT,
      expiry TEXT,
      photoUri TEXT,
      createdAt TEXT NOT NULL
    );
  `);

  // ------------------------------------
  // 🟩 Таблица семьи
  // ------------------------------------
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS family (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT,
      birthdate TEXT,
      allergies TEXT,
      photoUri TEXT,
      createdAt TEXT NOT NULL
    );
  `);

  // Добавить недостающие колонки
  await addColumnIfNotExists("family", "relation", "TEXT");
  await addColumnIfNotExists("family", "age", "TEXT");
  await addColumnIfNotExists("medicines", "userId", "INTEGER");
  await addColumnIfNotExists("medicines", "serverId", "INTEGER"); // ID на сервере для синхронизации
  await addColumnIfNotExists("medicines", "syncedAt", "TEXT"); // Время последней синхронизации

  // ------------------------------------
  // 🟨 Таблица связи "лекарство ↔ человек"
  // ------------------------------------
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS medicine_family (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medicineId INTEGER NOT NULL,
      familyId INTEGER NOT NULL,
      FOREIGN KEY(medicineId) REFERENCES medicines(id) ON DELETE CASCADE,
      FOREIGN KEY(familyId) REFERENCES family(id) ON DELETE CASCADE
    );
  `);

  // ------------------------------------
  // 🔔 Таблица напоминаний
  // ------------------------------------
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medicineId INTEGER,
      medicineName TEXT,
      title TEXT NOT NULL,
      body TEXT,
      hour INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      daysOfWeek TEXT,
      isActive INTEGER DEFAULT 1,
      notificationId TEXT,
      userId INTEGER,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(medicineId) REFERENCES medicines(id) ON DELETE SET NULL
    );
  `);

  console.log("📦 SQLite: таблицы готовы");
}
