import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../../src/context/ThemeContext";
import { useLanguage } from "../../../src/context/LanguageContext";
import { useAuthStore } from "../../../src/store/authStore";
import { useColors } from "../../../src/theme/colors";

export default function SettingsScreen() {
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  
  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case "ru": return t("language.russian");
      case "en": return t("language.english");
      case "he": return t("language.hebrew");
      default: return t("language.russian");
    }
  };

  const handleLanguageChange = () => {
    Alert.alert(
      t("language.select"),
      t("language.selectDescription"),
      [
        { text: t("language.russian"), onPress: () => setLanguage("ru") },
        { text: t("language.english"), onPress: () => setLanguage("en") },
        { text: t("language.hebrew"), onPress: () => setLanguage("he") },
        { text: t("common.cancel"), style: "cancel" },
      ]
    );
  };

  const handleAbout = () => {
    router.push("/(tabs)/settings/about");
  };

  const handleLogout = () => {
    Alert.alert(
      t("settings.logoutTitle"),
      t("settings.logoutConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.logout"),
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/(auth)/login");
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
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
      borderColor: colors.error + "40",
      backgroundColor: colors.error + "10",
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
        <Text style={styles.headerTitle}>{t("settings.title")}</Text>
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

      {/* ======= АККАУНТ ======= */}
      <View style={styles.sectionTitleWrapper}>
        <Text style={styles.sectionTitle}>{t("settings.account")}</Text>
      </View>

      <TouchableOpacity 
        style={styles.item}
        onPress={() => router.push("/(tabs)/settings/profile")}
      >
        <View style={styles.itemRowContent}>
          <MaterialCommunityIcons name="account-edit" size={24} color={colors.primary} style={styles.itemIcon} />
          <Text style={styles.itemText}>{t("settings.editProfile")}</Text>
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
    </ScrollView>
  );
}
