import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../src/store/authStore";
import { useColors } from "../../src/theme/colors";
import { useLanguage } from "../../src/context/LanguageContext";

export default function MoreScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();

  const menuItems = [
    {
      id: "medicines",
      title: t("tabs.medicines"),
      icon: "pill",
      iconColor: colors.primary,
      onPress: () => router.push("/(tabs)/medicines"),
    },
    {
      id: "health-trackers",
      title: t("more.healthTrackers"),
      icon: "chart-line",
      iconColor: colors.success,
      onPress: () => router.push("/(tabs)/health"),
    },
    {
      id: "diary",
      title: t("more.diary"),
      icon: "book-outline",
      iconColor: colors.warning,
      onPress: () => {},
    },
    {
      id: "doctors",
      title: t("more.doctors"),
      icon: "doctor",
      iconColor: colors.primary,
      onPress: () => {},
    },
  ];

  const settingsItems = [
    {
      id: "notifications",
      title: t("more.notifications"),
      icon: "bell",
      iconColor: colors.primary,
      onPress: () => router.push("/(tabs)/notifications"),
    },
    {
      id: "app-settings",
      title: t("more.settings"),
      icon: "cog",
      iconColor: colors.primary,
      onPress: () => router.push("/(tabs)/settings"),
    },
    {
      id: "help",
      title: t("settings.help"),
      icon: "help-circle",
      iconColor: colors.primary,
      onPress: () => {},
    },
    {
      id: "share",
      title: t("more.share"),
      icon: "share-variant",
      iconColor: colors.primary,
      onPress: () => {},
    },
  ];

  const additionalItems = [
    {
      id: "refill",
      title: t("more.refill"),
      icon: "cart",
      iconColor: colors.primary,
      hasBadge: true,
      onPress: () => {},
    },
  ];

  const renderMenuItem = (item: any, index: number, array: any[]) => {
    const itemStyles = StyleSheet.create({
      menuItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      },
      menuItemLast: {
        borderBottomWidth: 0,
      },
      iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
        position: "relative",
        backgroundColor: item.iconColor + "20",
      },
      badge: {
        position: "absolute",
        top: -4,
        right: -4,
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
      menuItemText: {
        flex: 1,
        color: colors.text,
        fontSize: 16,
        fontWeight: "500",
      },
    });

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          itemStyles.menuItem,
          index === array.length - 1 && itemStyles.menuItemLast,
        ]}
        onPress={item.onPress}
      >
        <View style={itemStyles.iconContainer}>
          <MaterialCommunityIcons
            name={item.icon as any}
            size={24}
            color={item.iconColor}
          />
          {item.hasBadge && (
            <View style={itemStyles.badge}>
              <MaterialCommunityIcons name="alert" size={12} color={colors.error} />
            </View>
          )}
        </View>
        <Text style={itemStyles.menuItemText}>{item.title}</Text>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
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
    sectionTitle: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      paddingHorizontal: 16,
      marginTop: 20,
      marginBottom: 8,
    },
    menuSection: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      overflow: "hidden",
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
        <Text style={styles.sectionTitle}>Опции</Text>
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => renderMenuItem(item, index, menuItems))}
        </View>

        {/* Дополнительные опции */}
        <View style={styles.menuSection}>
          {additionalItems.map((item, index) => renderMenuItem(item, index, additionalItems))}
        </View>

              {/* Настройки */}
              <Text style={styles.sectionTitle}>{t("settings.title")}</Text>
        <View style={styles.menuSection}>
          {settingsItems.map((item, index) => renderMenuItem(item, index, settingsItems))}
        </View>
      </ScrollView>
    </View>
  );
}
