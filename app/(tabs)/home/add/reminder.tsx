import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter, useLocalSearchParams } from "expo-router";
import { useCallback, useState, useEffect } from "react";
import {
  Alert,
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  Modal,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createReminder, updateReminder, getReminderById } from "../../../../src/database/reminders.service";
import { getAllMedicines } from "../../../../src/database/medicine.service";
import { useAuthStore } from "../../../../src/store/authStore";
import { useColors } from "../../../../src/theme/colors";
import { getAllFamilyMembers } from "../../../../src/services/family.service";
import { useLanguage } from "../../../../src/context/LanguageContext";

export default function AddReminderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ medicineId?: string; medicineName?: string; reminderId?: string }>();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();
  
  const isEditMode = !!params.reminderId;

  // Обработка системной кнопки "Назад" (Android)
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Возвращаемся на предыдущий экран
        router.back();
        return true; // Предотвращаем стандартное поведение
      };

      // Добавляем обработчик
      const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress);

      // Удаляем обработчик при размонтировании
      return () => backHandler.remove();
    }, [router])
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedMedicine, setSelectedMedicine] = useState<number | null>(null);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [recipientType, setRecipientType] = useState<"user" | "family">("user");
  const [selectedRecipientId, setSelectedRecipientId] = useState<number | null>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      loadMedicines();
      loadFamilyMembers();
    }
  }, [user?.id]);

  // Загружаем данные напоминания для редактирования
  useEffect(() => {
    async function loadReminderData() {
      if (params.reminderId && !isNaN(parseInt(params.reminderId))) {
        try {
          const reminderId = parseInt(params.reminderId);
          const reminder = await getReminderById(reminderId);
          
          if (reminder) {
            setTitle(reminder.title || "");
            setBody(reminder.body || "");
            setHour(reminder.hour || 9);
            setMinute(reminder.minute || 0);
            setSelectedDays(reminder.daysOfWeek || []);
            setSelectedMedicine(reminder.medicineId || null);
            setRecipientType(reminder.recipientType || "user");
            setSelectedRecipientId(reminder.recipientId || null);
          }
        } catch (error) {
          console.error("Error loading reminder:", error);
        }
      }
    }
    
    loadReminderData();
  }, [params.reminderId]);

  // Предзаполняем лекарство, если оно передано через параметры
  useEffect(() => {
    if (params.medicineId && medicines.length > 0 && !isEditMode) {
      const medicineId = parseInt(params.medicineId);
      if (!isNaN(medicineId)) {
        setSelectedMedicine(medicineId);
        // Предзаполняем название напоминания
        if (params.medicineName && !title) {
          setTitle(`${params.medicineName} - пора принять`);
        }
      }
    }
  }, [params.medicineId, params.medicineName, medicines, isEditMode]);
  
  async function loadFamilyMembers() {
    try {
      const data = await getAllFamilyMembers();
      setFamilyMembers(data || []);
    } catch (error) {
      console.error("Error loading family members:", error);
    }
  }

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

    // Показываем модальное окно выбора получателя
    setShowRecipientModal(true);
  };
  
  const handleConfirmRecipient = async () => {
    if (recipientType === "family" && !selectedRecipientId) {
      Alert.alert(t("common.error"), "Выберите члена семьи");
      return;
    }

    setShowRecipientModal(false);
    setLoading(true);

    try {
      const selectedMedicineData = medicines.find((m) => m.id === selectedMedicine);

      if (isEditMode && params.reminderId) {
        // Режим редактирования
        await updateReminder({
          id: parseInt(params.reminderId),
          medicineId: selectedMedicine || undefined,
          medicineName: selectedMedicineData?.name || undefined,
          title: title.trim(),
          body: body.trim() || undefined,
          hour,
          minute,
          daysOfWeek: selectedDays.length > 0 ? selectedDays : undefined,
          recipientType,
          recipientId: recipientType === "user" ? user.id : selectedRecipientId || undefined,
        });

        Alert.alert(t("common.success"), t("reminders.updated") || "Напоминание обновлено", [
          {
            text: t("common.ok"),
            onPress: () => router.back(),
          },
        ]);
      } else {
        // Режим создания
        await createReminder({
          medicineId: selectedMedicine || undefined,
          medicineName: selectedMedicineData?.name || undefined,
          title: title.trim(),
          body: body.trim() || undefined,
          hour,
          minute,
          daysOfWeek: selectedDays.length > 0 ? selectedDays : undefined,
          userId: user.id,
          recipientType,
          recipientId: recipientType === "user" ? user.id : selectedRecipientId || undefined,
        });

        Alert.alert(t("common.success"), t("reminders.created"), [
          {
            text: t("common.ok"),
            onPress: () => router.back(),
          },
        ]);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? "updating" : "creating"} reminder:`, error);
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
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: "80%",
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 20,
      textAlign: "center",
    },
    recipientTypeContainer: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 20,
    },
    recipientTypeButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: colors.lightGray,
      borderWidth: 2,
      borderColor: "transparent",
      gap: 8,
    },
    recipientTypeButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    recipientTypeText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    recipientTypeTextActive: {
      color: colors.white,
    },
    familyListContainer: {
      marginBottom: 20,
      maxHeight: 300,
    },
    familyListTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
    },
    familyList: {
      maxHeight: 250,
    },
    familyMemberItem: {
      padding: 16,
      borderRadius: 12,
      backgroundColor: colors.lightGray,
      marginBottom: 8,
      borderWidth: 2,
      borderColor: "transparent",
    },
    familyMemberItemSelected: {
      backgroundColor: colors.primary + "20",
      borderColor: colors.primary,
    },
    familyMemberName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    familyMemberNameSelected: {
      color: colors.primary,
    },
    familyMemberRole: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    emptyFamilyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      padding: 20,
    },
    modalButtons: {
      flexDirection: "row",
      gap: 12,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
    },
    modalButtonCancel: {
      backgroundColor: colors.lightGray,
    },
    modalButtonConfirm: {
      backgroundColor: colors.primary,
    },
    modalButtonDisabled: {
      opacity: 0.5,
    },
    modalButtonCancelText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    modalButtonConfirmText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.white,
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditMode ? (t("reminders.edit") || "Редактировать напоминание") : t("reminders.create")}
        </Text>
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
            {loading
              ? (isEditMode ? (t("reminders.updating") || "Сохранение...") : t("reminders.creating"))
              : (isEditMode ? (t("reminders.updateButton") || "Сохранить") : t("reminders.createButton"))}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Модальное окно выбора получателя */}
      <Modal
        visible={showRecipientModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRecipientModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Выберите получателя</Text>

            {/* Выбор типа получателя */}
            <View style={styles.recipientTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.recipientTypeButton,
                  recipientType === "user" && styles.recipientTypeButtonActive,
                ]}
                onPress={() => {
                  setRecipientType("user");
                  setSelectedRecipientId(null);
                }}
              >
                <MaterialCommunityIcons
                  name="account"
                  size={20}
                  color={recipientType === "user" ? colors.white : colors.text}
                />
                <Text
                  style={[
                    styles.recipientTypeText,
                    recipientType === "user" && styles.recipientTypeTextActive,
                  ]}
                >
                  Для меня
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.recipientTypeButton,
                  recipientType === "family" && styles.recipientTypeButtonActive,
                ]}
                onPress={() => setRecipientType("family")}
              >
                <MaterialCommunityIcons
                  name="account-group"
                  size={20}
                  color={recipientType === "family" ? colors.white : colors.text}
                />
                <Text
                  style={[
                    styles.recipientTypeText,
                    recipientType === "family" && styles.recipientTypeTextActive,
                  ]}
                >
                  Для семьи
                </Text>
              </TouchableOpacity>
            </View>

            {/* Список членов семьи (если выбран тип "семья") */}
            {recipientType === "family" && (
              <View style={styles.familyListContainer}>
                <Text style={styles.familyListTitle}>Выберите члена семьи:</Text>
                {familyMembers.length === 0 ? (
                  <Text style={styles.emptyFamilyText}>Нет добавленных членов семьи</Text>
                ) : (
                  <FlatList
                    data={familyMembers}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.familyMemberItem,
                          selectedRecipientId === item.id && styles.familyMemberItemSelected,
                        ]}
                        onPress={() =>
                          setSelectedRecipientId(selectedRecipientId === item.id ? null : item.id)
                        }
                      >
                        <Text
                          style={[
                            styles.familyMemberName,
                            selectedRecipientId === item.id && styles.familyMemberNameSelected,
                          ]}
                        >
                          {item.name}
                        </Text>
                        {item.role && (
                          <Text style={styles.familyMemberRole}>{item.role}</Text>
                        )}
                      </TouchableOpacity>
                    )}
                    style={styles.familyList}
                  />
                )}
              </View>
            )}

            {/* Кнопки модального окна */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowRecipientModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonConfirm,
                  loading && styles.modalButtonDisabled,
                ]}
                onPress={handleConfirmRecipient}
                disabled={loading}
              >
                <Text style={styles.modalButtonConfirmText}>Создать</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
