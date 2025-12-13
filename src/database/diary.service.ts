import {
  getSymptoms,
  getMoods,
  getActivities,
  getSleep,
  getDoctorVisits,
  getLabResults,
  getHealthMetrics,
  getWaterByDate,
} from "./health.service";
import { getHealthDB } from "./health.database";

export interface DiaryEntry {
  id: string;
  type: "symptom" | "mood" | "activity" | "sleep" | "water" | "doctor_visit" | "lab_result" | "health_metric";
  date: string;
  title: string;
  subtitle?: string;
  icon: string;
  data: any;
}

// Получить все записи дневника за период
export async function getDiaryEntries(
  userId?: number,
  startDate?: string,
  endDate?: string,
  limit: number = 100
): Promise<DiaryEntry[]> {
  const entries: DiaryEntry[] = [];

  console.log("📖 getDiaryEntries вызвана с userId:", userId, "limit:", limit);

  // Получаем симптомы из таблицы symptoms
  const symptoms = await getSymptoms(userId, limit);
  console.log("📖 Загружено симптомов из таблицы symptoms:", symptoms.length);
  symptoms.forEach((symptom) => {
    if (
      (!startDate || symptom.date >= startDate) &&
      (!endDate || symptom.date <= endDate)
    ) {
      entries.push({
        id: `symptom-${symptom.id}`,
        type: "symptom",
        date: symptom.date,
        title: symptom.name,
        subtitle: `Степень: ${symptom.severity}/10`,
        icon: "alert-circle",
        data: symptom,
      });
    }
  });

  // Получаем симптомы из health_metrics (где они сохраняются из трекера здоровья)
  const symptomMetrics = await getHealthMetrics("symptom", userId, limit);
  console.log("📖 Загружено симптомов из health_metrics:", symptomMetrics.length);
  symptomMetrics.forEach((metric) => {
    if (
      (!startDate || metric.date >= startDate) &&
      (!endDate || metric.date <= endDate)
    ) {
      // Формат: название симптома, затем пустая строка, затем заметки
      const lines = metric.notes?.split('\n') || [];
      const symptomName = lines[0]?.trim() || "Симптом";
      const notes = lines.slice(2).filter(line => line.trim()).join(' ') || undefined;
      entries.push({
        id: `symptom-metric-${metric.id}`,
        type: "symptom",
        date: metric.date,
        title: symptomName,
        subtitle: notes,
        icon: "alert-circle",
        data: metric,
      });
    }
  });

  // Получаем настроение из таблицы mood
  const moods = await getMoods(userId, limit);
  console.log("📖 Загружено настроений из таблицы mood:", moods.length);
  moods.forEach((mood) => {
    if (
      (!startDate || mood.date >= startDate) &&
      (!endDate || mood.date <= endDate)
    ) {
      const moodLabels = ["Очень плохо", "Плохо", "Нормально", "Хорошо", "Отлично"];
      entries.push({
        id: `mood-${mood.id}`,
        type: "mood",
        date: mood.date,
        title: moodLabels[mood.mood - 1] || "Неизвестно",
        subtitle: mood.notes || undefined,
        icon: "emoticon-happy",
        data: mood,
      });
    }
  });

  // Получаем настроение из health_metrics (где оно сохраняется из трекера здоровья)
  const moodMetrics = await getHealthMetrics("mood", userId, limit);
  console.log("📖 Загружено настроений из health_metrics:", moodMetrics.length);
  moodMetrics.forEach((metric) => {
    if (
      (!startDate || metric.date >= startDate) &&
      (!endDate || metric.date <= endDate)
    ) {
      const moodLabels = ["Очень плохо", "Плохо", "Нормально", "Хорошо", "Отлично"];
      const moodValue = Math.round(metric.value);
      entries.push({
        id: `mood-metric-${metric.id}`,
        type: "mood",
        date: metric.date,
        title: moodLabels[moodValue - 1] || "Неизвестно",
        subtitle: metric.notes || undefined,
        icon: "emoticon-happy",
        data: metric,
      });
    }
  });

  // Получаем активности из таблицы activities
  const activities = await getActivities(userId, limit);
  console.log("📖 Загружено активностей из таблицы activities:", activities.length);
  activities.forEach((activity) => {
    if (
      (!startDate || activity.date >= startDate) &&
      (!endDate || activity.date <= endDate)
    ) {
      entries.push({
        id: `activity-${activity.id}`,
        type: "activity",
        date: activity.date,
        title: activity.type,
        subtitle: `${activity.duration} мин${activity.calories ? `, ${activity.calories} ккал` : ""}`,
        icon: "run",
        data: activity,
      });
    }
  });

  // Получаем активности из health_metrics (где они сохраняются из трекера здоровья)
  const activityMetrics = await getHealthMetrics("activity", userId, limit);
  console.log("📖 Загружено активностей из health_metrics:", activityMetrics.length);
  activityMetrics.forEach((metric) => {
    if (
      (!startDate || metric.date >= startDate) &&
      (!endDate || metric.date <= endDate)
    ) {
      // Формат: тип активности, затем пустая строка, затем заметки
      const lines = metric.notes?.split('\n') || [];
      const activityType = lines[0]?.trim() || "Активность";
      const notes = lines.slice(2).filter(line => line.trim()).join(' ') || undefined;
      entries.push({
        id: `activity-metric-${metric.id}`,
        type: "activity",
        date: metric.date,
        title: activityType,
        subtitle: `${metric.value} ${metric.unit || "ч"}${notes ? `, ${notes}` : ""}`,
        icon: "run",
        data: metric,
      });
    }
  });

  // Получаем сон из таблицы sleep
  const sleep = await getSleep(userId, limit);
  console.log("📖 Загружено записей о сне из таблицы sleep:", sleep.length);
  sleep.forEach((sleepEntry) => {
    if (
      (!startDate || sleepEntry.date >= startDate) &&
      (!endDate || sleepEntry.date <= endDate)
    ) {
      entries.push({
        id: `sleep-${sleepEntry.id}`,
        type: "sleep",
        date: sleepEntry.date,
        title: `${sleepEntry.sleepHours} ч`,
        subtitle: `Качество: ${sleepEntry.quality}/5`,
        icon: "sleep",
        data: sleepEntry,
      });
    }
  });

  // Получаем сон из health_metrics (где он сохраняется из трекера здоровья)
  const sleepMetrics = await getHealthMetrics("sleep", userId, limit);
  console.log("📖 Загружено записей о сне из health_metrics:", sleepMetrics.length);
  sleepMetrics.forEach((metric) => {
    if (
      (!startDate || metric.date >= startDate) &&
      (!endDate || metric.date <= endDate)
    ) {
      // Извлекаем качество из notes (может быть в разных форматах)
      let quality: string | undefined;
      if (metric.notes) {
        const qualityMatch = metric.notes.match(/Качество сна: (\d+)/) || 
                           metric.notes.match(/Качество: (\d+)/) ||
                           metric.notes.match(/(\d+)\/5/);
        quality = qualityMatch ? qualityMatch[1] : undefined;
      }
      const notesWithoutQuality = metric.notes?.split('\n').filter(line => 
        !line.includes('Качество') && line.trim()
      ).join(' ') || undefined;
      entries.push({
        id: `sleep-metric-${metric.id}`,
        type: "sleep",
        date: metric.date,
        title: `${metric.value} ${metric.unit || "ч"}`,
        subtitle: quality ? `Качество: ${quality}/5` : notesWithoutQuality,
        icon: "sleep",
        data: metric,
      });
    }
  });

  // Получаем записи о воде
  try {
    const db = await getHealthDB();
    const waterQuery = userId
      ? `SELECT * FROM water WHERE userId = ? ORDER BY date DESC LIMIT ?`
      : `SELECT * FROM water ORDER BY date DESC LIMIT ?`;
    const waterParams = userId ? [userId, limit] : [limit];
    const waterEntries = await db.getAllAsync<{ id: number; userId?: number; amount: number; date: string }>(waterQuery, waterParams);
    
    waterEntries.forEach((water) => {
      if (
        (!startDate || water.date >= startDate) &&
        (!endDate || water.date <= endDate)
      ) {
        entries.push({
          id: `water-${water.id}`,
          type: "water",
          date: water.date,
          title: `Вода: ${water.amount} мл`,
          subtitle: undefined,
          icon: "cup-water",
          data: water,
        });
      }
    });
  } catch (error) {
    console.error("Error loading water entries:", error);
  }

  // Получаем визиты к врачу из таблицы doctor_visits
  const doctorVisits = await getDoctorVisits(userId, limit);
  console.log("📖 Загружено визитов к врачу из таблицы doctor_visits:", doctorVisits.length);
  doctorVisits.forEach((visit) => {
    if (
      (!startDate || visit.date >= startDate) &&
      (!endDate || visit.date <= endDate)
    ) {
      entries.push({
        id: `doctor-${visit.id}`,
        type: "doctor_visit",
        date: visit.date,
        title: visit.doctorName || "Визит к врачу",
        subtitle: visit.specialty || visit.reason || undefined,
        icon: "doctor",
        data: visit,
      });
    }
  });

  // Получаем визиты к врачу из health_metrics (где они сохраняются из трекера здоровья)
  const doctorVisitMetrics = await getHealthMetrics("doctor_visit", userId, limit);
  console.log("📖 Загружено визитов к врачу из health_metrics:", doctorVisitMetrics.length);
  doctorVisitMetrics.forEach((metric) => {
    if (
      (!startDate || metric.date >= startDate) &&
      (!endDate || metric.date <= endDate)
    ) {
      // Формат: "Имя врача: {name}\nДата визита: {date}\nПричина визита: {reason}\n{notes}"
      let doctorName = "Визит к врачу";
      let subtitle: string | undefined;
      if (metric.notes) {
        const lines = metric.notes.split('\n');
        // Ищем строку с именем врача (может быть на разных языках)
        const doctorLine = lines.find(line => 
          line.includes('Имя врача:') || 
          line.includes('Doctor Name:') || 
          line.includes('שם רופא:') ||
          line.includes('Врач / Специалист:')
        );
        if (doctorLine) {
          doctorName = doctorLine.split(':').slice(1).join(':').trim() || "Визит к врачу";
        }
        
        // Остальные строки (причина, заметки) как subtitle
        const otherLines = lines.filter(line => 
          !line.includes('Имя врача:') && 
          !line.includes('Doctor Name:') &&
          !line.includes('שם רופא:') &&
          !line.includes('Врач / Специалист:') &&
          !line.includes('Дата визита:') &&
          !line.includes('Visit Date:') &&
          !line.includes('תאריך ביקור:') &&
          line.trim()
        );
        subtitle = otherLines.length > 0 ? otherLines.join(', ') : undefined;
      }
      entries.push({
        id: `doctor-metric-${metric.id}`,
        type: "doctor_visit",
        date: metric.date,
        title: doctorName,
        subtitle: subtitle,
        icon: "doctor",
        data: metric,
      });
    }
  });

  // Получаем результаты анализов из таблицы lab_results
  const labResults = await getLabResults(userId, limit);
  console.log("📖 Загружено результатов анализов из таблицы lab_results:", labResults.length);
  labResults.forEach((lab) => {
    if (
      (!startDate || lab.date >= startDate) &&
      (!endDate || lab.date <= endDate)
    ) {
      entries.push({
        id: `lab-${lab.id}`,
        type: "lab_result",
        date: lab.date,
        title: lab.testName,
        subtitle: lab.result ? `${lab.result} ${lab.unit || ""}` : undefined,
        icon: "test-tube",
        data: lab,
      });
    }
  });

  // Получаем результаты анализов из health_metrics (где они сохраняются из трекера здоровья)
  const labResultMetrics = await getHealthMetrics("lab_result", userId, limit);
  console.log("📖 Загружено результатов анализов из health_metrics:", labResultMetrics.length);
  labResultMetrics.forEach((metric) => {
    if (
      (!startDate || metric.date >= startDate) &&
      (!endDate || metric.date <= endDate)
    ) {
      // Формат: "Название анализа: {name}\nРезультат: {result}\nДата анализа: {date}\n{notes}"
      let testName = "Анализ";
      let subtitle: string | undefined;
      if (metric.notes) {
        const lines = metric.notes.split('\n');
        // Ищем строку с названием анализа
        const testLine = lines.find(line => 
          line.includes('Название анализа:') || 
          line.includes('Lab Test Name:') || 
          line.includes('שם בדיקה:')
        );
        if (testLine) {
          testName = testLine.split(':').slice(1).join(':').trim() || "Анализ";
        }
        
        // Ищем строку с результатом
        const resultLine = lines.find(line => 
          line.includes('Результат:') || 
          line.includes('Lab Result:') || 
          line.includes('תוצאה:')
        );
        const result = resultLine ? resultLine.split(':').slice(1).join(':').trim() : undefined;
        
        // Остальные строки (заметки) как subtitle
        const otherLines = lines.filter(line => 
          !line.includes('Название анализа:') && 
          !line.includes('Lab Test Name:') &&
          !line.includes('שם בדיקה:') &&
          !line.includes('Результат:') &&
          !line.includes('Lab Result:') &&
          !line.includes('תוצאה:') &&
          !line.includes('Дата анализа:') &&
          !line.includes('Lab Date:') &&
          !line.includes('תאריך בדיקה:') &&
          line.trim()
        );
        subtitle = result || (otherLines.length > 0 ? otherLines.join(', ') : undefined);
      }
      entries.push({
        id: `lab-metric-${metric.id}`,
        type: "lab_result",
        date: metric.date,
        title: testName,
        subtitle: subtitle,
        icon: "test-tube",
        data: metric,
      });
    }
  });

  // Получаем метрики здоровья (давление, пульс, температура и т.д.)
  const metricTypes: Array<"blood_pressure" | "pulse" | "temperature" | "weight" | "blood_sugar"> = [
    "blood_pressure",
    "pulse",
    "temperature",
    "weight",
    "blood_sugar",
  ];

  for (const metricType of metricTypes) {
    const metrics = await getHealthMetrics(metricType, userId, limit);
    metrics.forEach((metric) => {
      if (
        (!startDate || metric.date >= startDate) &&
        (!endDate || metric.date <= endDate)
      ) {
        let title = "";
        let subtitle = "";
        let icon = "chart-line";

        switch (metricType) {
          case "blood_pressure":
            title = `Давление: ${metric.value}/${metric.value2} ${metric.unit || "мм рт.ст."}`;
            icon = "heart-pulse";
            break;
          case "pulse":
            title = `Пульс: ${metric.value} ${metric.unit || "уд/мин"}`;
            icon = "heart";
            break;
          case "temperature":
            title = `Температура: ${metric.value} ${metric.unit || "°C"}`;
            icon = "thermometer";
            break;
          case "weight":
            title = `Вес: ${metric.value} ${metric.unit || "кг"}`;
            icon = "scale-bathroom";
            break;
          case "blood_sugar":
            title = `Сахар: ${metric.value} ${metric.unit || "ммоль/л"}`;
            icon = "water";
            break;
        }

        if (metric.notes) {
          subtitle = metric.notes;
        }

        entries.push({
          id: `metric-${metric.id}`,
          type: "health_metric",
          date: metric.date,
          title,
          subtitle,
          icon,
          data: metric,
        });
      }
    });
  }

  // Сортируем по дате (новые сначала)
  entries.sort((a, b) => {
    // Обрабатываем разные форматы дат
    const dateA = a.date.includes('T') ? new Date(a.date).getTime() : new Date(a.date + 'T00:00:00').getTime();
    const dateB = b.date.includes('T') ? new Date(b.date).getTime() : new Date(b.date + 'T00:00:00').getTime();
    return dateB - dateA;
  });

  console.log("📖 Всего записей в дневнике:", entries.length);
  return entries;
}

