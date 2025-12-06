import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";

interface Medicine {
  name: string;
  dosage: string;
  timeHour: number;
  timeMinute: number;
}

export async function scheduleMedicineReminder(medicine: Medicine) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Пора принять лекарство 💊",
      body: `${medicine.name} — ${medicine.dosage}`,
      sound: "default",
    },
    trigger: {
      type: SchedulableTriggerInputTypes.CALENDAR,
      hour: medicine.timeHour,
      minute: medicine.timeMinute,
      repeats: true,
    },
  });
}
