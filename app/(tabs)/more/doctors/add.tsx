import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter, useLocalSearchParams } from "expo-router";
import { useCallback, useState, useEffect } from "react";
import {
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../../../src/store/authStore";
import { useColors } from "../../../../src/theme/colors";
import { useLanguage } from "../../../../src/context/LanguageContext";
import { useTheme } from "../../../../src/context/ThemeContext";
import { saveDoctor, getDoctorById, Doctor } from "../../../../src/database/doctors.service";

export default function AddDoctorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const isEditMode = !!params.id;
  const parsedDoctorId = params.id ? Number(params.id) : NaN;
  const doctorId = Number.isFinite(parsedDoctorId) ? parsedDoctorId : undefined;

  // Обработка системной кнопки "Назад"
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.back();
        return true;
      };

      const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => backHandler.remove();
    }, [router])
  );

  useEffect(() => {
    if (isEditMode && doctorId) {
      loadDoctor();
    }
  }, [isEditMode, doctorId]);

  const loadDoctor = async () => {
    if (!doctorId) return;

    try {
      const doctor = await getDoctorById(doctorId, user?.id);
      if (doctor) {
        setName(doctor.name || "");
        setSpecialty(doctor.specialty || "");
        setPhone(doctor.phone || "");
        setEmail(doctor.email || "");
        setAddress(doctor.address || "");
        setNotes(doctor.notes || "");
      }
    } catch (error) {
      console.error("Error loading doctor:", error);
      Alert.alert(t("common.error") || "Ошибка", t("doctors.loadError") || "Не удалось загрузить данные врача");
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t("common.error") || "Ошибка", t("doctors.nameRequired") || "Введите имя врача");
      return;
    }
    if (!user?.id) {
      Alert.alert(t("common.error") || "Ошибка", t("common.userNotFound") || "Пользователь не найден");
      return;
    }

    setLoading(true);
    try {
      const doctorData: Doctor = {
        id: isEditMode && doctorId ? doctorId : undefined,
        userId: user.id,
        name: name.trim(),
        specialty: specialty.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      await saveDoctor(doctorData);
      router.back();
    } catch (error) {
      console.error("Error saving doctor:", error);
      Alert.alert(t("common.error") || "Ошибка", t("doctors.saveError") || "Не удалось сохранить врача");
    } finally {
      setLoading(false);
    }
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
      paddingBottom: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    saveButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    saveButtonText: {
      color: colors.white,
      fontWeight: "600",
      fontSize: 14,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    content: {
      flex: 1,
    },
    form: {
      padding: 16,
    },
    inputGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: "top",
    },
    required: {
      color: colors.error,
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
          {isEditMode ? t("doctors.edit") || "Редактировать врача" : t("doctors.add") || "Добавить врача"}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.saveButtonText}>{t("common.save") || "Сохранить"}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t("doctors.name") || "Имя врача"} <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t("doctors.namePlaceholder") || "Введите имя врача"}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("doctors.specialty") || "Специализация"}</Text>
            <TextInput
              style={styles.input}
              value={specialty}
              onChangeText={setSpecialty}
              placeholder={t("doctors.specialtyPlaceholder") || "Например: Терапевт, Кардиолог"}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("doctors.phone") || "Телефон"}</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder={t("doctors.phonePlaceholder") || "+7 (999) 123-45-67"}
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("doctors.email") || "Email"}</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t("doctors.emailPlaceholder") || "doctor@example.com"}
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("doctors.address") || "Адрес"}</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder={t("doctors.addressPlaceholder") || "Адрес клиники или кабинета"}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("doctors.notes") || "Заметки"}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t("doctors.notesPlaceholder") || "Дополнительная информация"}
              placeholderTextColor={colors.textSecondary}
              multiline
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

