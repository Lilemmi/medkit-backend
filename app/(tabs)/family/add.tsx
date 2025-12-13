import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  BackHandler,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { saveFamilyMember } from "../../../src/services/family.service";
import { useColors } from "../../../src/theme/colors";
import { useLanguage } from "../../../src/context/LanguageContext";
import BirthDatePicker from "../../../src/components/BirthDatePicker";

export default function AddFamilyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();

  // Обработка системной кнопки "Назад" (Android)
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

  // Основная информация
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [birthDate, setBirthDate] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [allergies, setAllergies] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Медицинская информация
  const [weight, setWeight] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [chronicDiseases, setChronicDiseases] = useState<string>("");
  const [medicalConditions, setMedicalConditions] = useState<string>("");
  const [organConditions, setOrganConditions] = useState<string>("");

  const [loading, setLoading] = useState(false);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("common.error"), "Нужен доступ к галерее");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("common.error"), "Нужен доступ к камере");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const showImagePicker = () => {
    Alert.alert("Выберите фото", "", [
      { text: t("common.cancel"), style: "cancel" },
      { text: "Камера", onPress: takePhoto },
      { text: "Галерея", onPress: pickImage },
    ]);
  };

  async function save() {
    if (!name.trim()) {
      Alert.alert(t("common.error"), "Введите имя");
      return;
    }

    setLoading(true);

    try {
      await saveFamilyMember({
        name: name.trim(),
        role: role.trim() || null,
        birthdate: birthDate || null, // Используем birthDate вместо birthdate для совместимости
        birthDate: birthDate || null, // Новое поле
        gender: gender || null,
        allergies: allergies.trim() || null,
        photoUri: photoUri || null,
        weight: weight.trim() ? parseFloat(weight.trim()) : null,
        height: height.trim() ? parseFloat(height.trim()) : null,
        chronicDiseases: chronicDiseases.trim() 
          ? chronicDiseases.split(",").map(d => d.trim()).filter(d => d)
          : null,
        medicalConditions: medicalConditions.trim()
          ? medicalConditions.split(",").map(c => c.trim()).filter(c => c)
          : null,
        organConditions: organConditions.trim()
          ? organConditions.split(",").map(o => o.trim()).filter(o => o)
          : null,
      });

      Alert.alert(t("common.success"), "Член семьи добавлен", [
        {
          text: t("common.ok"),
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error("Error saving family member:", error);
      Alert.alert(t("common.error"), "Не удалось сохранить члена семьи");
    } finally {
      setLoading(false);
    }
  }

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
    photoSection: {
      alignItems: "center",
      paddingVertical: 32,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 3,
      borderColor: colors.primary,
    },
    avatarPlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.lightGray,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 3,
      borderColor: colors.primary,
    },
    editPhotoButton: {
      position: "absolute",
      bottom: 0,
      right: "35%",
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 3,
      borderColor: colors.surface,
    },
    section: {
      backgroundColor: colors.surface,
      padding: 16,
      marginTop: 16,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 16,
    },
    inputGroup: {
      marginBottom: 16,
    },
    row: {
      flexDirection: "row",
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    genderContainer: {
      flexDirection: "row",
      gap: 8,
    },
    genderButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.lightGray,
      borderWidth: 2,
      borderColor: "transparent",
      alignItems: "center",
    },
    genderButtonActive: {
      backgroundColor: colors.primary + "20",
      borderColor: colors.primary,
    },
    genderButtonText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    genderButtonTextActive: {
      color: colors.primary,
      fontWeight: "600",
    },
    input: {
      backgroundColor: colors.lightGray,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    textArea: {
      minHeight: 100,
      paddingTop: 12,
    },
    saveButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
      marginHorizontal: 16,
      marginTop: 24,
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("family.addMember")}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Фото профиля */}
      <View style={styles.photoSection}>
        <TouchableOpacity onPress={showImagePicker}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialCommunityIcons name="camera" size={40} color={colors.gray} />
            </View>
          )}
          <View style={styles.editPhotoButton}>
            <MaterialCommunityIcons name="pencil" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Основная информация */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Основная информация</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("family.name")} *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Введите имя"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("family.role")}</Text>
          <TextInput
            style={styles.input}
            value={role}
            onChangeText={setRole}
            placeholder={t("family.role")}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Дата рождения */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Дата рождения</Text>
          <BirthDatePicker
            value={birthDate}
            onChange={setBirthDate}
            placeholder="Выберите дату рождения"
          />
        </View>

        {/* Пол */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Пол</Text>
          <View style={styles.genderContainer}>
            <TouchableOpacity
              style={[styles.genderButton, gender === "male" && styles.genderButtonActive]}
              onPress={() => setGender("male")}
            >
              <Text style={[styles.genderButtonText, gender === "male" && styles.genderButtonTextActive]}>
                Мужской
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderButton, gender === "female" && styles.genderButtonActive]}
              onPress={() => setGender("female")}
            >
              <Text style={[styles.genderButtonText, gender === "female" && styles.genderButtonTextActive]}>
                Женский
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderButton, gender === "other" && styles.genderButtonActive]}
              onPress={() => setGender("other")}
            >
              <Text style={[styles.genderButtonText, gender === "other" && styles.genderButtonTextActive]}>
                Другое
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Медицинская информация */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Медицинская информация</Text>

        {/* Вес и рост */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8, marginBottom: 0 }]}>
            <Text style={styles.label}>Вес (кг)</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              placeholder="70"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8, marginBottom: 0 }]}>
            <Text style={styles.label}>Рост (см)</Text>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              placeholder="175"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
        </View>
        <View style={{ marginBottom: 16 }} />

        {/* Хронические заболевания */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Хронические заболевания</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={chronicDiseases}
            onChangeText={setChronicDiseases}
            placeholder="Диабет, гипертония, астма (через запятую)"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Особые состояния */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Особые состояния</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={medicalConditions}
            onChangeText={setMedicalConditions}
            placeholder="Беременность, диабет, астма (через запятую)"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Состояния органов */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Состояния органов (влияют на дозировки)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={organConditions}
            onChangeText={setOrganConditions}
            placeholder="Проблемы с печенью, почками (через запятую)"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </View>

      {/* Аллергии */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("family.allergies")}</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("family.allergies")}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={allergies}
            onChangeText={setAllergies}
            placeholder={t("family.allergies")}
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </View>

      {/* Кнопка сохранения */}
      <TouchableOpacity
        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
        onPress={save}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.saveButtonText}>{t("family.save")}</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
