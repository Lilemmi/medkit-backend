import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState, useEffect } from "react";
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
import { useAuthStore } from "../../../../src/store/authStore";
import { api } from "../../../../src/api/api";
import { useColors } from "../../../../src/theme/colors";
import { useLanguage } from "../../../../src/context/LanguageContext";

export default function ProfileEditScreen() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
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

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [allergies, setAllergies] = useState(user?.allergies || "");
  const [photoUri, setPhotoUri] = useState(user?.photoUri || null);
  
  // Основная информация
  const [birthDate, setBirthDate] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  
  // Медицинская информация
  const [weight, setWeight] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [chronicDiseases, setChronicDiseases] = useState<string>("");
  const [medicalConditions, setMedicalConditions] = useState<string>("");
  const [organConditions, setOrganConditions] = useState<string>("");
  
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setAllergies(user.allergies || "");
      setPhotoUri(user.photoUri || null);
      
      // Основная информация
      if (user.birthDate) {
        const date = new Date(user.birthDate);
        setBirthDate(date.toISOString().split('T')[0]);
      }
      setGender(user.gender || "");
      
      // Медицинская информация
      setWeight(user.weight ? user.weight.toString() : "");
      setHeight(user.height ? user.height.toString() : "");
      setChronicDiseases(
        user.chronicDiseases 
          ? (Array.isArray(user.chronicDiseases) ? user.chronicDiseases.join(", ") : String(user.chronicDiseases))
          : ""
      );
      setMedicalConditions(
        user.medicalConditions 
          ? (Array.isArray(user.medicalConditions) ? user.medicalConditions.join(", ") : String(user.medicalConditions))
          : ""
      );
      setOrganConditions(
        user.organConditions 
          ? (Array.isArray(user.organConditions) ? user.organConditions.join(", ") : String(user.organConditions))
          : ""
      );
    }
  }, [user]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("common.error"), t("profile.galleryPermission"));
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
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("common.error"), t("profile.cameraPermission"));
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
    Alert.alert(t("profile.selectPhoto"), "", [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("profile.camera"), onPress: takePhoto },
      { text: t("profile.gallery"), onPress: pickImage },
    ]);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t("common.error"), t("profile.enterName"));
      return;
    }

    if (!email.trim()) {
      Alert.alert(t("common.error"), t("profile.enterEmail"));
      return;
    }

    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(t("common.error"), t("profile.invalidEmail"));
      return;
    }

    setLoading(true);

    try {
      const updateData: any = {
        name: name.trim(),
        email: email.trim(),
      };

      if (phone.trim()) {
        updateData.phone = phone.trim();
      }

      if (allergies.trim()) {
        updateData.allergies = allergies.trim();
      }

      if (photoUri && photoUri !== user?.photoUri) {
        // Здесь можно загрузить фото на сервер
        // Пока сохраняем локально
        updateData.photoUri = photoUri;
      }

      // Основная информация
      if (birthDate.trim()) {
        // Преобразуем дату в ISO 8601 формат
        let formattedDate = birthDate.trim();
        
        // Если дата в формате YYYY-MM-DD, используем как есть
        if (/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
          updateData.birthDate = formattedDate;
        } 
        // Если дата в формате ММ.ГГГГ, преобразуем в YYYY-MM-DD
        else if (/^\d{2}\.\d{4}$/.test(formattedDate)) {
          const [month, year] = formattedDate.split(".");
          updateData.birthDate = `${year}-${month}-01`; // Используем 1-е число месяца
        }
        // Если это валидная дата, преобразуем в ISO формат
        else {
          try {
            const date = new Date(formattedDate);
            if (!isNaN(date.getTime())) {
              updateData.birthDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
            }
          } catch (e) {
            console.error("Error parsing birthDate:", e);
          }
        }
      }
      if (gender) {
        updateData.gender = gender;
      }

      // Медицинская информация
      if (weight.trim()) {
        const weightNum = parseFloat(weight.trim());
        if (!isNaN(weightNum) && weightNum > 0) {
          updateData.weight = weightNum;
        }
      }
      if (height.trim()) {
        const heightNum = parseFloat(height.trim());
        if (!isNaN(heightNum) && heightNum > 0) {
          updateData.height = heightNum;
        }
      }
      if (chronicDiseases.trim()) {
        updateData.chronicDiseases = chronicDiseases.split(",").map(d => d.trim()).filter(d => d);
      }
      if (medicalConditions.trim()) {
        updateData.medicalConditions = medicalConditions.split(",").map(c => c.trim()).filter(c => c);
      }
      if (organConditions.trim()) {
        updateData.organConditions = organConditions.split(",").map(o => o.trim()).filter(o => o);
      }

      const response = await api.patch("/users/me", updateData);
      
      if (response.data) {
        setUser(response.data);
        Alert.alert(t("common.success"), t("profile.profileUpdated"), [
          {
            text: t("common.ok"),
            onPress: () => router.back(),
          },
        ]);
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("profile.updateError")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert(t("common.error"), t("profile.fillAllFields"));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t("common.error"), t("profile.passwordMismatch"));
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(t("common.error"), t("profile.passwordMinLength"));
      return;
    }

    setPasswordLoading(true);

    try {
      await api.patch("/users/me/password", {
        oldPassword,
        newPassword,
      });

      Alert.alert(t("common.success"), t("profile.passwordChanged"));
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("profile.passwordError")
      );
    } finally {
      setPasswordLoading(false);
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
    changePasswordButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: "center",
      marginTop: 8,
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    changePasswordButtonDisabled: {
      opacity: 0.6,
    },
    changePasswordButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
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
        <Text style={styles.headerTitle}>{t("profile.editProfile")}</Text>
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
        <Text style={styles.sectionTitle}>{t("profile.basicInfo")}</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("profile.name")}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t("profile.namePlaceholder")}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("profile.email")}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={t("profile.emailPlaceholder")}
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("profile.phone")}</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder={t("profile.phonePlaceholder")}
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
          />
        </View>

        {/* Дата рождения */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Дата рождения</Text>
          <TextInput
            style={styles.input}
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder="ГГГГ-ММ-ДД"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
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
        <Text style={styles.sectionTitle}>{t("profile.allergies")}</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("profile.allergiesLabel")}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={allergies}
            onChangeText={setAllergies}
            placeholder={t("profile.allergiesPlaceholder")}
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </View>

      {/* Смена пароля */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("profile.changePassword")}</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("profile.currentPassword")}</Text>
          <TextInput
            style={styles.input}
            value={oldPassword}
            onChangeText={setOldPassword}
            placeholder={t("profile.currentPasswordPlaceholder")}
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("profile.newPassword")}</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={t("profile.newPasswordPlaceholder")}
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("profile.confirmPassword")}</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t("profile.confirmPasswordPlaceholder")}
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.changePasswordButton, passwordLoading && styles.changePasswordButtonDisabled]}
          onPress={handleChangePassword}
          disabled={passwordLoading || loading}
        >
          {passwordLoading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.changePasswordButtonText}>{t("profile.changePasswordButton")}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Кнопка сохранения */}
      <TouchableOpacity
        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={loading || passwordLoading}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.saveButtonText}>
            {t("profile.saveChanges")}
          </Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

