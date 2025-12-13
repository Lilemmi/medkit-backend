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
  try {
    const database = await getDB();

    const info = await database.getAllAsync(`PRAGMA table_info(${table});`);
    const exists = info.some((c: any) => c.name === column);

    if (!exists) {
      await database.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
      console.log(`🛠 Добавлена колонка "${column}" в таблицу "${table}"`);
      return true;
    }
    // Убираем логи для существующих колонок, чтобы не засорять консоль
    return false;
  } catch (error: any) {
    // Игнорируем ошибку, если колонка уже существует
    if (error?.message?.includes("duplicate column") || error?.message?.includes("already exists")) {
      return false;
    }
    console.error(`❌ Ошибка добавления колонки "${column}" в таблицу "${table}":`, error);
    throw error;
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
  
  // Основная информация
  await addColumnIfNotExists("family", "birthDate", "TEXT"); // Дата рождения в формате YYYY-MM-DD
  await addColumnIfNotExists("family", "gender", "TEXT"); // Пол: "male", "female", "other"
  
  // Медицинская информация
  await addColumnIfNotExists("family", "weight", "REAL"); // Вес в кг
  await addColumnIfNotExists("family", "height", "REAL"); // Рост в см
  await addColumnIfNotExists("family", "chronicDiseases", "TEXT"); // JSON массив хронических заболеваний
  await addColumnIfNotExists("family", "medicalConditions", "TEXT"); // JSON массив особых состояний
  await addColumnIfNotExists("family", "organConditions", "TEXT"); // JSON массив состояний органов
  await addColumnIfNotExists("medicines", "userId", "INTEGER");
  await addColumnIfNotExists("medicines", "serverId", "INTEGER"); // ID на сервере для синхронизации
  await addColumnIfNotExists("medicines", "syncedAt", "TEXT"); // Время последней синхронизации
  
  // Параметры приема лекарства
  await addColumnIfNotExists("medicines", "takeWithFood", "TEXT"); // до еды, после еды, во время еды, независимо
  await addColumnIfNotExists("medicines", "takeWithLiquid", "TEXT"); // чем запивать (вода, молоко и т.д.)
  await addColumnIfNotExists("medicines", "incompatibleMedicines", "TEXT"); // JSON массив названий несовместимых препаратов
  await addColumnIfNotExists("medicines", "compatibleMedicines", "TEXT"); // JSON массив с информацией о совместимых препаратах
  await addColumnIfNotExists("medicines", "forbiddenFoods", "TEXT"); // JSON массив запрещенных продуктов
  await addColumnIfNotExists("medicines", "recommendedFoods", "TEXT"); // JSON массив рекомендуемых продуктов
  await addColumnIfNotExists("medicines", "alcoholInteraction", "TEXT"); // взаимодействие с алкоголем
  await addColumnIfNotExists("medicines", "caffeineInteraction", "TEXT"); // взаимодействие с кофе/чаем
  await addColumnIfNotExists("medicines", "storageConditions", "TEXT"); // условия хранения
  await addColumnIfNotExists("medicines", "specialInstructions", "TEXT"); // особые указания
  await addColumnIfNotExists("medicines", "sideEffects", "TEXT"); // побочные эффекты
  await addColumnIfNotExists("medicines", "contraindications", "TEXT"); // противопоказания
  await addColumnIfNotExists("medicines", "quantity", "INTEGER"); // количество упаковок
  await addColumnIfNotExists("medicines", "totalPills", "INTEGER"); // общее количество таблеток в упаковке
  await addColumnIfNotExists("medicines", "usedPills", "INTEGER"); // использовано таблеток
  await addColumnIfNotExists("medicines", "pillsPerDose", "INTEGER"); // количество таблеток на один прием (по умолчанию 1)
  await addColumnIfNotExists("medicines", "lowStockThreshold", "INTEGER"); // порог для уведомления о низком количестве (по умолчанию 10)
  await addColumnIfNotExists("medicines", "familyMemberId", "INTEGER"); // ID члена семьи, для кого предназначено лекарство (null = для пользователя)
  await addColumnIfNotExists("medicines", "userDosage", "TEXT"); // дозировка для конкретного пользователя/члена семьи
  
  // Новые поля для расширенной информации о лекарстве
  await addColumnIfNotExists("medicines", "internationalName", "TEXT"); // Международное непатентованное название (МНН)
  await addColumnIfNotExists("medicines", "manufacturer", "TEXT"); // Производитель
  await addColumnIfNotExists("medicines", "packageVolume", "TEXT"); // Объём / количество в упаковке
  await addColumnIfNotExists("medicines", "category", "TEXT"); // Категория лекарства
  await addColumnIfNotExists("medicines", "activeIngredients", "TEXT"); // JSON массив активных веществ
  await addColumnIfNotExists("medicines", "indications", "TEXT"); // JSON показания к применению
  await addColumnIfNotExists("medicines", "contraindicationsDetailed", "TEXT"); // JSON детальные противопоказания
  await addColumnIfNotExists("medicines", "warnings", "TEXT"); // JSON предупреждения и риски
  await addColumnIfNotExists("medicines", "foodCompatibility", "TEXT"); // JSON совместимость с едой
  await addColumnIfNotExists("medicines", "drugCompatibility", "TEXT"); // JSON совместимость с другими препаратами
  await addColumnIfNotExists("medicines", "dosageDetailed", "TEXT"); // JSON детальная дозировка
  await addColumnIfNotExists("medicines", "childrenRestrictions", "TEXT"); // JSON ограничения для детей
  await addColumnIfNotExists("medicines", "sideEffectsDetailed", "TEXT"); // JSON детальные побочные эффекты
  await addColumnIfNotExists("medicines", "storageConditionsDetailed", "TEXT"); // JSON детальные условия хранения
  await addColumnIfNotExists("medicines", "additionalRecommendations", "TEXT"); // JSON дополнительные рекомендации
  await addColumnIfNotExists("medicines", "specialGroupsInfo", "TEXT"); // JSON информация для специальных групп (беременные, кормящие, дети, пожилые, хронические болезни)
  await addColumnIfNotExists("medicines", "analogs", "TEXT"); // JSON аналоги и заменители препарата

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

  // Добавить недостающие колонки в reminders
  await addColumnIfNotExists("reminders", "updatedAt", "TEXT");
  await addColumnIfNotExists("reminders", "recipientType", "TEXT"); // "user" или "family"
  await addColumnIfNotExists("reminders", "recipientId", "INTEGER"); // userId или familyMemberId
  await addColumnIfNotExists("reminders", "repeatNotificationIds", "TEXT"); // JSON массив идентификаторов повторяющихся уведомлений

  // ------------------------------------
  // 🛒 Таблица уведомлений о пополнении
  // ------------------------------------
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS refill_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medicineName TEXT NOT NULL,
      dose TEXT,
      reason TEXT NOT NULL,
      reasonType TEXT NOT NULL,
      medicineId INTEGER,
      userId INTEGER NOT NULL,
      isResolved INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      resolvedAt TEXT,
      FOREIGN KEY(medicineId) REFERENCES medicines(id) ON DELETE SET NULL
    );
  `);

  // 🗑️ Таблица удаленных лекарств (для предотвращения восстановления при синхронизации)
  // ------------------------------------
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS deleted_medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serverId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      deletedAt TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(serverId, userId)
    );
  `);

  // 📋 Таблица журнала приема медикаментов
  // ------------------------------------
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS medication_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medicineId INTEGER,
      medicineName TEXT NOT NULL,
      reminderId INTEGER,
      userId INTEGER NOT NULL,
      takenAt TEXT NOT NULL DEFAULT (datetime('now')),
      scheduledTime TEXT,
      dose TEXT,
      notes TEXT,
      pillsTaken INTEGER DEFAULT 1,
      FOREIGN KEY(medicineId) REFERENCES medicines(id) ON DELETE SET NULL,
      FOREIGN KEY(reminderId) REFERENCES reminders(id) ON DELETE SET NULL
    );
  `);

  // Добавляем колонку pillsTaken если её нет
  await addColumnIfNotExists("medication_log", "pillsTaken", "INTEGER");

  console.log("📦 SQLite: таблицы готовы");
}
