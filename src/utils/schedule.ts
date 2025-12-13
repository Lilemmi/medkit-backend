import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";

interface Medicine {
  name: string;
  dosage: string;
  timeHour: number;
  timeMinute: number;
}

export async function scheduleMedicineReminder(medicine: Medicine) {
  // Вычисляем дату и время первого срабатывания
  const now = new Date();
  const targetDate = new Date();
  targetDate.setHours(medicine.timeHour, medicine.timeMinute, 0, 0);
  
  // Если время уже прошло сегодня, планируем на завтра
  if (targetDate <= now) {
    targetDate.setDate(targetDate.getDate() + 1);
  }
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Пора принять лекарство 💊",
      body: `${medicine.name} — ${medicine.dosage}`,
      sound: "default", // Звук по умолчанию
      priority: Notifications.AndroidNotificationPriority.MAX, // Максимальный приоритет
      categoryIdentifier: "medication-reminder", // Категория для группировки
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: targetDate,
      repeats: true, // Повторяем каждый день
    } as any,
  });
}
