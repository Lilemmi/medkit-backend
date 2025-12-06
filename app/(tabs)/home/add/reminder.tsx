import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createReminder } from "../../../../src/database/reminders.service";
import { getAllMedicines } from "../../../../src/database/medicine.service";
import { useAuthStore } from "../../../../src/store/authStore";
import { useColors } from "../../../../src/theme/colors";

export default function AddReminderScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedMedicine, setSelectedMedicine] = useState<number | null>(null);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadMedicines();
    }
  }, [user?.id]);

  async function loadMedicines() {
    if (!user?.id) return;
    try {
      const data = await getAllMedicines(user.id);
      setMedicines(data || []);
    } catch (error) {
      console.error("Error loading medicines:", error);
    }
  }

  const daysOfWeek = [
    { id: 0, name: "Вс", fullName: "Воскресенье" },
    { id: 1, name: "Пн", fullName: "Понедельник" },
    { id: 2, name: "Вт", fullName: "Вторник" },
    { id: 3, name: "Ср", fullName: "Среда" },
    { id: 4, name: "Чт", fullName: "Четверг" },
    { id: 5, name: "Пт", fullName: "Пятница" },
    { id: 6, name: "Сб", fullName: "Суббота" },
  ];

  const toggleDay = (dayId: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayId)
        ? prev.filter((d) => d !== dayId)
        : [...prev, dayId].sort()
    );
  };

  const handleTimeChange = (type: "hour" | "minute", value: string) => {
    const numValue = parseInt(value) || 0;
    if (type === "hour") {
      if (numValue >= 0 && numValue <= 23) {
        setHour(numValue);
      }
    } else {
      if (numValue >= 0 && numValue <= 59) {
        setMinute(numValue);
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t("common.error"), t("reminders.nameRequired"));
      return;
    }

    if (!user?.id) {
      Alert.alert(t("common.error"), t("reminders.userNotFound"));
      return;
    }

    setLoading(true);

    try {
      const selectedMedicineData = medicines.find((m) => m.id === selectedMedicine);

      await createReminder({
        medicineId: selectedMedicine || undefined,
        medicineName: selectedMedicineData?.name || undefined,
        title: title.trim(),
        body: body.trim() || undefined,
        hour,
        minute,
        daysOfWeek: selectedDays.length > 0 ? selectedDays : undefined,
        userId: user.id,
      });

      Alert.alert(t("common.success"), t("reminders.created"), [
        {
          text: t("common.ok"),
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Error creating reminder:", error);
      Alert.alert(t("common.error"), t("reminders.error"));
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (h: number, m: number) => {
    const hStr = h.toString().padStart(2, "0");
    const mStr = m.toString().padStart(2, "0");
    return `${hStr}:${mStr}`;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    content: {
      padding: 20,
      paddingBottom: 40,
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 24,
    },
    section: {
      marginBottom: 24,
    },
    label: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    hint: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    textArea: {
      height: 100,
      textAlignVertical: "top",
    },
    medicinesList: {
      marginTop: 8,
    },
    medicineChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
    },
    medicineChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    medicineChipText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "500",
    },
    medicineChipTextSelected: {
      color: colors.white,
    },
    timeContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    timeInputGroup: {
      flex: 1,
    },
    timeLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    timeInput: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      textAlign: "center",
    },
    timeSeparator: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
      marginTop: 20,
    },
    timeDisplay: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary + "20",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      gap: 8,
    },
    timeDisplayText: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.primary,
    },
    daysContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 8,
    },
    dayButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    dayButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    dayButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    dayButtonTextSelected: {
      color: colors.white,
    },
    saveButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      marginTop: 10,
      marginBottom: 20,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: colors.white,
      fontSize: 18,
      fontWeight: "600",
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("reminders.create")}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>{t("reminders.name")}</Text>
          <TextInput
            placeholder={t("reminders.namePlaceholder")}
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t("reminders.description")}</Text>
          <TextInput
            placeholder={t("reminders.descriptionPlaceholder")}
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, styles.textArea]}
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={3}
          />
        </View>

        {medicines.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>{t("reminders.linkMedicine")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.medicinesList}>
              {medicines.map((med) => (
                <TouchableOpacity
                  key={med.id}
                  style={[
                    styles.medicineChip,
                    selectedMedicine === med.id && styles.medicineChipSelected,
                  ]}
                  onPress={() =>
                    setSelectedMedicine(selectedMedicine === med.id ? null : med.id)
                  }
                >
                  <Text
                    style={[
                      styles.medicineChipText,
                      selectedMedicine === med.id && styles.medicineChipTextSelected,
                    ]}
                  >
                    {med.name || t("scan.notSpecified")}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>{t("reminders.time")}</Text>
          <View style={styles.timeContainer}>
            <View style={styles.timeInputGroup}>
              <Text style={styles.timeLabel}>{t("reminders.hours")}</Text>
              <TextInput
                style={styles.timeInput}
                value={hour.toString()}
                onChangeText={(value) => handleTimeChange("hour", value)}
                keyboardType="number-pad"
                maxLength={2}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <Text style={styles.timeSeparator}>:</Text>
            <View style={styles.timeInputGroup}>
              <Text style={styles.timeLabel}>{t("reminders.minutes")}</Text>
              <TextInput
                style={styles.timeInput}
                value={minute.toString()}
                onChangeText={(value) => handleTimeChange("minute", value)}
                keyboardType="number-pad"
                maxLength={2}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.timeDisplay}>
              <MaterialCommunityIcons name="clock-outline" size={24} color={colors.primary} />
              <Text style={styles.timeDisplayText}>{formatTime(hour, minute)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t("reminders.days")}</Text>
          <Text style={styles.hint}>
            {t("reminders.daysHint")}
          </Text>
          <View style={styles.daysContainer}>
            {daysOfWeek.map((day) => (
              <TouchableOpacity
                key={day.id}
                style={[
                  styles.dayButton,
                  selectedDays.includes(day.id) && styles.dayButtonSelected,
                ]}
                onPress={() => toggleDay(day.id)}
              >
                <Text
                  style={[
                    styles.dayButtonText,
                    selectedDays.includes(day.id) && styles.dayButtonTextSelected,
                  ]}
                >
                  {day.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {selectedDays.length === 0 && (
            <Text style={styles.hint}>{t("reminders.daysDaily")}</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? t("reminders.creating") : t("reminders.createButton")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
