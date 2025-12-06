import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../../src/store/authStore";
import { useColors } from "../../../src/theme/colors";
import { useLanguage } from "../../../src/context/LanguageContext";

export default function HealthTrackerScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();

  const healthCategories = [
    {
      id: "vitals",
      title: t("health.vitals"),
      items: [
        {
          id: "blood-pressure",
          title: t("health.bloodPressure"),
          icon: "heart-pulse",
          color: colors.error,
          route: "/(tabs)/health/blood-pressure",
        },
        {
          id: "pulse",
          title: t("health.pulse"),
          icon: "heart",
          color: colors.error,
          route: "/(tabs)/health/pulse",
        },
        {
          id: "temperature",
          title: t("health.temperature"),
          icon: "thermometer",
          color: colors.warning,
          route: "/(tabs)/health/temperature",
        },
        {
          id: "blood-sugar",
          title: t("health.bloodSugar"),
          icon: "water",
          color: colors.success,
          route: "/(tabs)/health/blood-sugar",
        },
      ],
    },
    {
      id: "body",
      title: t("health.body"),
      items: [
        {
          id: "weight",
          title: t("health.weight"),
          icon: "scale-bathroom",
          color: colors.primary,
          route: "/(tabs)/health/weight",
        },
      ],
    },
    {
      id: "wellbeing",
      title: t("health.wellbeing"),
      items: [
        {
          id: "mood",
          title: t("health.mood"),
          icon: "emoticon-happy",
          color: "#FFD60A",
          route: "/(tabs)/health/mood",
        },
        {
          id: "symptoms",
          title: t("health.symptoms"),
          icon: "alert-circle",
          color: colors.warning,
          route: "/(tabs)/health/symptoms",
        },
      ],
    },
    {
      id: "lifestyle",
      title: t("health.lifestyle"),
      items: [
        {
          id: "activity",
          title: t("health.activity"),
          icon: "run",
          color: colors.success,
          route: "/(tabs)/health/activity",
        },
        {
          id: "sleep",
          title: t("health.sleep"),
          icon: "sleep",
          color: "#5856D6",
          route: "/(tabs)/health/sleep",
        },
        {
          id: "water",
          title: t("health.water"),
          icon: "cup-water",
          color: "#007AFF",
          route: "/(tabs)/health/water",
        },
      ],
    },
    {
      id: "medical",
      title: t("health.medical"),
      items: [
        {
          id: "doctor-visits",
          title: t("health.doctorVisits"),
          icon: "doctor",
          color: colors.primary,
          route: "/(tabs)/health/doctor-visits",
        },
        {
          id: "lab-results",
          title: t("health.labResults"),
          icon: "test-tube",
          color: "#AF52DE",
          route: "/(tabs)/health/lab-results",
        },
      ],
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
      paddingHorizontal: 16,
      paddingBottom: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    content: {
      paddingBottom: 40,
      paddingHorizontal: 16,
    },
    pageTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 8,
      marginTop: 20,
    },
    pageSubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 24,
    },
    categorySection: {
      marginBottom: 24,
    },
    categoryTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    itemsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    itemCard: {
      width: "47%",
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
    },
    itemTitle: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.text,
      textAlign: "center",
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <MaterialCommunityIcons name="heart-pulse" size={28} color={colors.primary} />
        <Text style={styles.headerTitle}>{t("health.title")}</Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>{t("health.title")}</Text>
        <Text style={styles.pageSubtitle}>
          {t("health.subtitle")}
        </Text>

        {healthCategories.map((category) => (
          <View key={category.id} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <View style={styles.itemsGrid}>
              {category.items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.itemCard}
                  onPress={() => router.push(item.route as any)}
                >
                  <View style={[styles.iconContainer, { backgroundColor: item.color + "20" }]}>
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={32}
                      color={item.color}
                    />
                  </View>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
