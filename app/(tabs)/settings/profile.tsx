import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  Alert,
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
import { useAuthStore } from "../../../src/store/authStore";
import { api } from "../../../src/api/api";
import { useColors } from "../../../src/theme/colors";
import { useLanguage } from "../../../src/context/LanguageContext";

export default function ProfileEditScreen() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [allergies, setAllergies] = useState(user?.allergies || "");
  const [photoUri, setPhotoUri] = useState(user?.photoUri || null);
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
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
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

