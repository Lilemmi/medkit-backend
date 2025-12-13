import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { BackHandler, ScrollView, StyleSheet, Text, TouchableOpacity, View, Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../../src/store/authStore";
import { useColors } from "../../../src/theme/colors";
import { useLanguage } from "../../../src/context/LanguageContext";
import { useTheme } from "../../../src/context/ThemeContext";

export default function MoreScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();
  const { isDark } = useTheme();

  // Обработка системной кнопки "Назад" на вкладке "Еще"
  // Корневой экран вкладки - не обрабатываем кнопку Назад (стандарт Android)
  // Только вложенные экраны обрабатывают кнопку Назад

  const menuItems = [
    {
      id: "notifications",
      title: t("tabs.notifications") || "Уведомления",
      icon: "bell",
      iconColor: colors.primary,
      onPress: () => router.push("/(tabs)/more/notifications"),
    },
    {
      id: "health-trackers",
      title: t("more.healthTrackers"),
      icon: "chart-line",
      iconColor: colors.success,
      onPress: () => router.push("/(tabs)/more/health"),
    },
    {
      id: "diary",
      title: t("more.diary"),
      icon: "book-outline",
      iconColor: colors.warning,
      onPress: () => router.push("/(tabs)/more/diary"),
    },
    {
      id: "doctors",
      title: t("more.doctors"),
      icon: "doctor",
      iconColor: colors.primary,
      onPress: () => router.push("/(tabs)/more/doctors"),
    },
  ];

  const settingsItems = [
    {
      id: "profile",
      title: t("settings.editProfile"),
      icon: "account-edit",
      iconColor: colors.primary,
      onPress: () => router.push("/(tabs)/more/settings/profile"),
    },
    {
      id: "app-settings",
      title: t("more.settings"),
      icon: "cog",
      iconColor: colors.primary,
      onPress: () => router.push("/(tabs)/more/settings"),
    },
    {
      id: "help",
      title: t("settings.help"),
      icon: "help-circle",
      iconColor: colors.primary,
      onPress: () => router.push("/(tabs)/more/help"),
    },
    {
      id: "share",
      title: t("more.share"),
      icon: "share-variant",
      iconColor: colors.primary,
      onPress: () => {
        Share.share({
          message: t("share.message") || "Попробуйте Smart Aid Kit - умную аптечку для всей семьи! Управляйте лекарствами, отслеживайте здоровье и не забывайте о приеме препаратов.",
          title: t("share.title") || "Smart Aid Kit",
        }).catch((error: any) => console.error("Error sharing:", error));
      },
    },
  ];

  const additionalItems = [
    {
      id: "refill",
      title: t("more.refill"),
      icon: "cart",
      iconColor: colors.primary,
      hasBadge: true,
      onPress: () => router.push("/(tabs)/more/refill"),
    },
  ];

  const renderMenuItem = (item: any) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.item}
        onPress={item.onPress}
      >
        <View style={styles.itemRowContent}>
          <MaterialCommunityIcons
            name={item.icon as any}
            size={24}
            color={item.iconColor}
            style={styles.itemIcon}
          />
          <View style={styles.itemTextContainer}>
            <View style={styles.itemTextRow}>
              <Text style={styles.itemText}>{item.title}</Text>
              {item.hasBadge && (
                <View style={styles.badge}>
                  <MaterialCommunityIcons name="alert" size={12} color={colors.error} />
                </View>
              )}
            </View>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
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
    itemTextRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    itemText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: "500",
    },
    badge: {
      marginLeft: 8,
      backgroundColor: colors.surface,
      borderRadius: 8,
      width: 16,
      height: 16,
      justifyContent: "center",
      alignItems: "center",
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Опции */}
        <View style={styles.sectionTitleWrapper}>
          <Text style={styles.sectionTitle}>Опции</Text>
        </View>
        {menuItems.map((item) => renderMenuItem(item))}

        {/* Дополнительные опции */}
        {additionalItems.map((item) => renderMenuItem(item))}

        {/* Настройки */}
        <View style={styles.sectionTitleWrapper}>
          <Text style={styles.sectionTitle}>{t("settings.title")}</Text>
        </View>
        {settingsItems.map((item) => renderMenuItem(item))}
      </ScrollView>
    </View>
  );
}
