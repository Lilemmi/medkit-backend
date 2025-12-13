import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState, useEffect } from "react";
import { BackHandler, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View , Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../../../src/context/ThemeContext";
import { useLanguage } from "../../../../src/context/LanguageContext";
import { useAuthStore } from "../../../../src/store/authStore";
import { useColors } from "../../../../src/theme/colors";
import Modal from "../../../../src/components/Modal";
import { clearAllDatabases } from "../../../../src/database/medicine-cleanup.service";

export default function SettingsScreen() {
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [clearingData, setClearingData] = useState(false);

  // Обработка системной кнопки "Назад" (Android)
  // Возвращаемся на предыдущий экран внутри вкладки "Больше"
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

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case "ru": return t("language.russian");
      case "en": return t("language.english");
      case "he": return t("language.hebrew");
      default: return t("language.russian");
    }
  };

  const handleLanguageChange = () => {
    setShowLanguageModal(true);
  };

  const handleAbout = () => {
    router.push("/(tabs)/more/settings/about");
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleClearData = () => {
    setShowClearDataModal(true);
  };

  const confirmClearData = async () => {
    setClearingData(true);
    try {
      const { user } = useAuthStore.getState();
      await clearAllDatabases(user?.id || undefined);
      Alert.alert(
        t("common.success") || "Успешно",
        "База данных очищена",
        [{ text: t("common.ok") || "OK" }]
      );
    } catch (error) {
      console.error("Ошибка при очистке базы данных:", error);
      Alert.alert(
        t("common.error") || "Ошибка",
        "Не удалось очистить базу данных"
      );
    } finally {
      setClearingData(false);
      setShowClearDataModal(false);
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
    contentContainer: {
      paddingBottom: 40,
    },
    sectionTitleWrapper: {
      marginTop: 20,
      marginBottom: 8,
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    item: {
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 16,
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      elevation: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowRadius: 2,
    },
    itemRow: {
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 16,
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      elevation: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowRadius: 2,
    },
    itemRowContent: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    itemIcon: {
      marginRight: 12,
    },
    itemTextContainer: {
      flex: 1,
    },
    itemText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: "500",
    },
    itemSubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    exit: {
      marginTop: 20,
      backgroundColor: "#FFE5E5", // Бледно-красный цвет
      borderColor: "#FFCCCC", // Бледно-красная обводка
    },
    exitText: {
      color: colors.error,
      fontWeight: "600",
    },
  });

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { flex: 1, textAlign: "center" }]}>{t("settings.title")}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* ======= ОФОРМЛЕНИЕ ======= */}
      <View style={styles.sectionTitleWrapper}>
        <Text style={styles.sectionTitle}>{t("settings.appearance")}</Text>
      </View>

      <View style={styles.itemRow}>
        <View style={styles.itemRowContent}>
          <MaterialCommunityIcons name="theme-light-dark" size={24} color={colors.primary} style={styles.itemIcon} />
          <Text style={styles.itemText}>{t("settings.darkTheme")}</Text>
        </View>
        <Switch 
          value={isDark} 
          onValueChange={toggleTheme}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.white}
        />
      </View>

      {/* ======= ЯЗЫК ======= */}
      <View style={styles.sectionTitleWrapper}>
        <Text style={styles.sectionTitle}>{t("settings.language")}</Text>
      </View>

      <TouchableOpacity style={styles.item} onPress={handleLanguageChange}>
        <View style={styles.itemRowContent}>
          <MaterialCommunityIcons name="translate" size={24} color={colors.primary} style={styles.itemIcon} />
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemText}>{t("settings.appLanguage")}</Text>
            <Text style={styles.itemSubtext}>{getLanguageLabel(language)}</Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* ======= УВЕДОМЛЕНИЯ ======= */}
      <View style={styles.sectionTitleWrapper}>
        <Text style={styles.sectionTitle}>{t("settings.notifications") || "Уведомления"}</Text>
      </View>

      <TouchableOpacity style={styles.item} onPress={() => router.push("/(tabs)/more/settings/notifications")}>
        <View style={styles.itemRowContent}>
          <MaterialCommunityIcons name="bell" size={24} color={colors.primary} style={styles.itemIcon} />
          <Text style={styles.itemText}>{t("settings.notificationSettings") || "Настройки уведомлений"}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* ======= ИНФОРМАЦИЯ ======= */}
      <View style={styles.sectionTitleWrapper}>
        <Text style={styles.sectionTitle}>{t("settings.information")}</Text>
      </View>

      <TouchableOpacity style={styles.item} onPress={handleAbout}>
        <View style={styles.itemRowContent}>
          <MaterialCommunityIcons name="information" size={24} color={colors.primary} style={styles.itemIcon} />
          <Text style={styles.itemText}>{t("settings.about")}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* ======= ДАННЫЕ ======= */}
      <View style={styles.sectionTitleWrapper}>
        <Text style={styles.sectionTitle}>Данные</Text>
      </View>

      <TouchableOpacity 
        style={[styles.item, clearingData && { opacity: 0.5 }]} 
        onPress={handleClearData}
        disabled={clearingData}
      >
        <View style={styles.itemRowContent}>
          <MaterialCommunityIcons name="database-remove" size={24} color={colors.warning || colors.error} style={styles.itemIcon} />
          <Text style={[styles.itemText, { color: colors.warning || colors.error }]}>
            {clearingData ? "Очистка..." : "Очистить базу данных"}
          </Text>
        </View>
      </TouchableOpacity>

      {/* ======= ВЫЙТИ ======= */}
      <TouchableOpacity style={[styles.item, styles.exit]} onPress={handleLogout}>
        <View style={styles.itemRowContent}>
          <MaterialCommunityIcons name="logout" size={24} color={colors.error} style={styles.itemIcon} />
          <Text style={[styles.itemText, styles.exitText]}>
            {t("settings.logout")}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      {/* Модальное окно выбора языка */}
      <Modal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        title={t("language.select")}
        subtitle={t("language.selectDescription")}
        buttonLayout="column"
        buttons={[
          {
            text: t("language.russian"),
            onPress: () => {
              setLanguage("ru");
              setShowLanguageModal(false);
            },
            style: language === "ru" ? "primary" : "default",
          },
          {
            text: t("language.english"),
            onPress: () => {
              setLanguage("en");
              setShowLanguageModal(false);
            },
            style: language === "en" ? "primary" : "default",
          },
          {
            text: t("language.hebrew"),
            onPress: () => {
              setLanguage("he");
              setShowLanguageModal(false);
            },
            style: language === "he" ? "primary" : "default",
          },
          {
            text: t("common.cancel"),
            onPress: () => setShowLanguageModal(false),
            style: "cancel",
          },
        ]}
      />

      {/* Модальное окно подтверждения выхода */}
      <Modal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title={t("settings.logoutTitle")}
        message={t("settings.logoutConfirm")}
        buttons={[
          {
            text: t("common.cancel"),
            onPress: () => setShowLogoutModal(false),
            style: "cancel",
          },
          {
            text: t("settings.logout"),
            onPress: async () => {
              await logout();
              router.replace("/(auth)/login");
            },
            style: "destructive",
          },
        ]}
      />

      {/* Модальное окно подтверждения очистки данных */}
      <Modal
        visible={showClearDataModal}
        onClose={() => setShowClearDataModal(false)}
        title="Очистить базу данных"
        message="Вы уверены, что хотите удалить все данные? Это действие нельзя отменить. Все лекарства, напоминания и история будут удалены."
        buttons={[
          {
            text: t("common.cancel"),
            onPress: () => setShowClearDataModal(false),
            style: "cancel",
          },
          {
            text: "Очистить",
            onPress: confirmClearData,
            style: "destructive",
          },
        ]}
      />
    </ScrollView>
  );
}
