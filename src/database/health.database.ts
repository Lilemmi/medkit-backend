import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

export async function getHealthDB(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync("health.db");
  
  // Создаем таблицы для различных типов данных здоровья
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS health_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      type TEXT NOT NULL,
      value REAL,
      value2 REAL,
      unit TEXT,
      notes TEXT,
      date TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS symptoms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      name TEXT NOT NULL,
      severity INTEGER,
      notes TEXT,
      date TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mood (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      mood INTEGER NOT NULL,
      notes TEXT,
      date TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      type TEXT NOT NULL,
      duration INTEGER,
      calories INTEGER,
      notes TEXT,
      date TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sleep (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      sleepHours REAL,
      quality INTEGER,
      notes TEXT,
      date TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS water (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      amount INTEGER NOT NULL,
      date TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS doctor_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      doctorName TEXT,
      specialty TEXT,
      reason TEXT,
      diagnosis TEXT,
      prescription TEXT,
      date TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lab_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      testName TEXT NOT NULL,
      result TEXT,
      unit TEXT,
      normalRange TEXT,
      notes TEXT,
      date TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      name TEXT NOT NULL,
      specialty TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      notes TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  console.log("📦 Health DB: таблицы готовы");
  return db;
}










