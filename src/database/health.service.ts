import { getHealthDB } from "./health.database";

export type HealthMetricType = 
  | "blood_pressure" 
  | "pulse" 
  | "temperature" 
  | "weight" 
  | "height"
  | "activity"
  | "doctor_visit"
  | "lab_result"
  | "mood"
  | "sleep"
  | "symptom" 
  | "blood_sugar"
  | "oxygen";

export interface HealthMetric {
  id?: number;
  userId?: number;
  type: HealthMetricType;
  value: number;
  value2?: number; // Для давления (систолическое/диастолическое)
  unit?: string;
  notes?: string;
  date: string;
}

export interface Symptom {
  id?: number;
  userId?: number;
  name: string;
  severity: number; // 1-10
  notes?: string;
  date: string;
}

export interface Mood {
  id?: number;
  userId?: number;
  mood: number; // 1-5 (очень плохо - отлично)
  notes?: string;
  date: string;
}

export interface Activity {
  id?: number;
  userId?: number;
  type: string;
  duration: number; // минуты
  calories?: number;
  notes?: string;
  date: string;
}

export interface Sleep {
  id?: number;
  userId?: number;
  sleepHours: number;
  quality: number; // 1-5
  notes?: string;
  date: string;
}

export interface Water {
  id?: number;
  userId?: number;
  amount: number; // мл
  date: string;
}

export interface DoctorVisit {
  id?: number;
  userId?: number;
  doctorName?: string;
  specialty?: string;
  reason?: string;
  diagnosis?: string;
  prescription?: string;
  date: string;
}

export interface LabResult {
  id?: number;
  userId?: number;
  testName: string;
  result?: string;
  unit?: string;
  normalRange?: string;
  notes?: string;
  date: string;
}

// Сохранить метрику здоровья
export async function saveHealthMetric(metric: HealthMetric) {
  const db = await getHealthDB();
  await db.runAsync(
    `INSERT INTO health_metrics (userId, type, value, value2, unit, notes, date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [metric.userId ?? null, metric.type, metric.value, metric.value2 || null, metric.unit || null, metric.notes || null, metric.date]
  );
}

// Получить метрики по типу
export async function getHealthMetrics(type: HealthMetricType, userId?: number, limit: number = 30) {
  const db = await getHealthDB();
  const query = userId 
    ? `SELECT * FROM health_metrics WHERE type = ? AND userId = ? ORDER BY date DESC LIMIT ?`
    : `SELECT * FROM health_metrics WHERE type = ? ORDER BY date DESC LIMIT ?`;
  const params = userId ? [type, userId, limit] : [type, limit];
  return await db.getAllAsync<HealthMetric>(query, params);
}

// Сохранить симптом
export async function saveSymptom(symptom: Symptom) {
  const db = await getHealthDB();
  await db.runAsync(
    `INSERT INTO symptoms (userId, name, severity, notes, date)
     VALUES (?, ?, ?, ?, ?)`,
    [symptom.userId ?? null, symptom.name, symptom.severity, symptom.notes || null, symptom.date]
  );
}

// Получить симптомы
export async function getSymptoms(userId?: number, limit: number = 30) {
  const db = await getHealthDB();
  const query = userId
    ? `SELECT * FROM symptoms WHERE userId = ? ORDER BY date DESC LIMIT ?`
    : `SELECT * FROM symptoms ORDER BY date DESC LIMIT ?`;
  const params = userId ? [userId, limit] : [limit];
  return await db.getAllAsync<Symptom>(query, params);
}

// Сохранить настроение
export async function saveMood(mood: Mood) {
  const db = await getHealthDB();
  await db.runAsync(
    `INSERT INTO mood (userId, mood, notes, date)
     VALUES (?, ?, ?, ?)`,
    [mood.userId ?? null, mood.mood, mood.notes || null, mood.date]
  );
}

// Получить настроения
export async function getMoods(userId?: number, limit: number = 30) {
  const db = await getHealthDB();
  const query = userId
    ? `SELECT * FROM mood WHERE userId = ? ORDER BY date DESC LIMIT ?`
    : `SELECT * FROM mood ORDER BY date DESC LIMIT ?`;
  const params = userId ? [userId, limit] : [limit];
  return await db.getAllAsync<Mood>(query, params);
}

// Сохранить активность
export async function saveActivity(activity: Activity) {
  const db = await getHealthDB();
  await db.runAsync(
    `INSERT INTO activities (userId, type, duration, calories, notes, date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [activity.userId ?? null, activity.type, activity.duration, activity.calories || null, activity.notes || null, activity.date]
  );
}

// Получить активности
export async function getActivities(userId?: number, limit: number = 30) {
  const db = await getHealthDB();
  const query = userId
    ? `SELECT * FROM activities WHERE userId = ? ORDER BY date DESC LIMIT ?`
    : `SELECT * FROM activities ORDER BY date DESC LIMIT ?`;
  const params = userId ? [userId, limit] : [limit];
  return await db.getAllAsync<Activity>(query, params);
}

// Сохранить сон
export async function saveSleep(sleep: Sleep) {
  const db = await getHealthDB();
  await db.runAsync(
    `INSERT INTO sleep (userId, sleepHours, quality, notes, date)
     VALUES (?, ?, ?, ?, ?)`,
    [sleep.userId ?? null, sleep.sleepHours, sleep.quality, sleep.notes || null, sleep.date]
  );
}

// Получить данные о сне
export async function getSleep(userId?: number, limit: number = 30) {
  const db = await getHealthDB();
  const query = userId
    ? `SELECT * FROM sleep WHERE userId = ? ORDER BY date DESC LIMIT ?`
    : `SELECT * FROM sleep ORDER BY date DESC LIMIT ?`;
  const params = userId ? [userId, limit] : [limit];
  return await db.getAllAsync<Sleep>(query, params);
}

// Сохранить воду
export async function saveWater(water: Water) {
  const db = await getHealthDB();
  await db.runAsync(
    `INSERT INTO water (userId, amount, date)
     VALUES (?, ?, ?)`,
    [water.userId ?? null, water.amount, water.date]
  );
}

// Получить воду за день
export async function getWaterByDate(date: string, userId?: number) {
  const db = await getHealthDB();
  const query = userId
    ? `SELECT SUM(amount) as total FROM water WHERE date = ? AND userId = ?`
    : `SELECT SUM(amount) as total FROM water WHERE date = ?`;
  const params = userId ? [date, userId] : [date];
  const result = await db.getFirstAsync<{ total: number }>(query, params);
  return result?.total || 0;
}

// Сохранить визит к врачу
export async function saveDoctorVisit(visit: DoctorVisit) {
  const db = await getHealthDB();
  await db.runAsync(
    `INSERT INTO doctor_visits (userId, doctorName, specialty, reason, diagnosis, prescription, date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [visit.userId ?? null, visit.doctorName || null, visit.specialty || null, visit.reason || null,
     visit.diagnosis || null, visit.prescription || null, visit.date]
  );
}

// Получить визиты к врачу
export async function getDoctorVisits(userId?: number, limit: number = 30) {
  const db = await getHealthDB();
  const query = userId
    ? `SELECT * FROM doctor_visits WHERE userId = ? ORDER BY date DESC LIMIT ?`
    : `SELECT * FROM doctor_visits ORDER BY date DESC LIMIT ?`;
  const params = userId ? [userId, limit] : [limit];
  return await db.getAllAsync<DoctorVisit>(query, params);
}

// Сохранить результат анализа
export async function saveLabResult(lab: LabResult) {
  const db = await getHealthDB();
  await db.runAsync(
    `INSERT INTO lab_results (userId, testName, result, unit, normalRange, notes, date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [lab.userId ?? null, lab.testName, lab.result || null, lab.unit || null,
     lab.normalRange || null, lab.notes || null, lab.date]
  );
}

// Получить результаты анализов
export async function getLabResults(userId?: number, limit: number = 30) {
  const db = await getHealthDB();
  const query = userId
    ? `SELECT * FROM lab_results WHERE userId = ? ORDER BY date DESC LIMIT ?`
    : `SELECT * FROM lab_results ORDER BY date DESC LIMIT ?`;
  const params = userId ? [userId, limit] : [limit];
  return await db.getAllAsync<LabResult>(query, params);
}

// Удалить запись
export async function deleteHealthRecord(table: string, id: number) {
  const db = await getHealthDB();
  await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, [id]);
}










