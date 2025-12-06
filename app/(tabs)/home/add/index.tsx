import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../../../../src/theme/colors";
import { useLanguage } from "../../../../src/context/LanguageContext";

export default function AddMedicineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 32,
    },
    optionsContainer: {
      gap: 20,
    },
    optionCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    optionTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    optionDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <Text style={styles.title}>{t("add.title")}</Text>
      <Text style={styles.subtitle}>{t("add.subtitle")}</Text>

      <View style={styles.optionsContainer}>
        {/* Сканировать коробку */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => router.push("/(tabs)/home/add/scan")}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons name="camera" size={32} color={colors.white} />
          </View>
          <Text style={styles.optionTitle}>{t("add.scanBox")}</Text>
          <Text style={styles.optionDescription}>
            {t("add.scanDescription")}
          </Text>
        </TouchableOpacity>

        {/* Добавить вручную */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => router.push("/(tabs)/home/add/manual")}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.success }]}>
            <MaterialCommunityIcons name="pencil" size={32} color={colors.white} />
          </View>
          <Text style={styles.optionTitle}>{t("add.manual")}</Text>
          <Text style={styles.optionDescription}>
            {t("add.manualDescription")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
