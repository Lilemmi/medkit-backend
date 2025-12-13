import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { BackHandler, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../../../../src/theme/colors";
import { useLanguage } from "../../../../src/context/LanguageContext";

export default function AddMedicineScreen() {
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
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      flex: 1,
      textAlign: "center",
      marginHorizontal: 12,
    },
    contentContainer: {
      flex: 1,
      padding: 20,
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
    <View style={styles.container}>
      {/* Header с кнопкой назад */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t("add.title")}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.contentContainer, { paddingTop: 20 }]}>
      <Text style={styles.subtitle}>{t("add.subtitle")}</Text>

      <View style={styles.optionsContainer}>
        {/* Сканировать лекарство */}
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
    </View>
  );
}
