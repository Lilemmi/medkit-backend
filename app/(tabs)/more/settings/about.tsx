import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { BackHandler, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { useColors } from "../../../../src/theme/colors";
import { useLanguage } from "../../../../src/context/LanguageContext";

export default function AboutScreen() {
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
  
  const appVersion = Constants.expoConfig?.version || "1.0.0";
  const expoVersion = Constants.expoRuntimeVersion || Constants.expoConfig?.sdkVersion || "N/A";

  const features = [
    {
      icon: "pill-multiple",
      text: t("about.feature1"),
    },
    {
      icon: "camera",
      text: t("about.feature2"),
    },
    {
      icon: "chart-line",
      text: t("about.feature3"),
    },
    {
      icon: "account-group",
      text: t("about.feature4"),
    },
    {
      icon: "bell",
      text: t("about.feature5"),
    },
  ];

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
    logoContainer: {
      alignItems: "center",
      paddingVertical: 40,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    logoCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.primary + "20",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
      borderWidth: 3,
      borderColor: colors.primary,
    },
    appName: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 8,
    },
    appTagline: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      paddingHorizontal: 32,
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
      marginBottom: 12,
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    infoRowLast: {
      borderBottomWidth: 0,
    },
    infoLabel: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    infoValue: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    description: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
      marginTop: 8,
    },
    featureItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
      gap: 12,
    },
    featureIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + "20",
      justifyContent: "center",
      alignItems: "center",
    },
    featureText: {
      fontSize: 16,
      color: colors.text,
      flex: 1,
    },
    contactSection: {
      backgroundColor: colors.surface,
      padding: 16,
      marginTop: 16,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    contactText: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
      marginTop: 8,
    },
    emailContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 12,
      padding: 12,
      backgroundColor: colors.lightGray,
      borderRadius: 8,
      gap: 8,
    },
    emailText: {
      fontSize: 16,
      color: colors.primary,
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
        <Text style={styles.headerTitle}>{t("about.title")}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Логотип/Иконка */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="medical-bag" size={64} color={colors.primary} />
          </View>
          <Text style={styles.appName}>{t("about.appName")}</Text>
          <Text style={styles.appTagline}>{t("about.appTagline")}</Text>
        </View>

        {/* Информация о версии */}
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("about.appVersion")}</Text>
            <Text style={styles.infoValue}>{appVersion}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoLabel}>{t("about.expoVersion")}</Text>
            <Text style={styles.infoValue}>{expoVersion}</Text>
          </View>
        </View>

        {/* Описание */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("about.aboutMedkit")}</Text>
          <Text style={styles.description}>{t("about.description")}</Text>
        </View>

        {/* Основные функции */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("about.mainFeatures")}</Text>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <MaterialCommunityIcons
                  name={feature.icon as any}
                  size={24}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>

        {/* Контакты */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>{t("about.contacts")}</Text>
          <Text style={styles.contactText}>{t("about.contactText")}</Text>
          <View style={styles.emailContainer}>
            <MaterialCommunityIcons name="email" size={20} color={colors.primary} />
            <Text style={styles.emailText}>{t("about.email")}</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
