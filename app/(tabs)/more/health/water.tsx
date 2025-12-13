import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState, useEffect } from "react";
import { Alert, BackHandler, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../../../src/store/authStore";
import { saveWater, getWaterByDate } from "../../../../src/database/health.service";
import { useColors } from "../../../../src/theme/colors";
import { useLanguage } from "../../../../src/context/LanguageContext";

const WATER_AMOUNTS = [100, 200, 250, 300, 500];

export default function WaterScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const colors = useColors();

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
  const { t } = useLanguage();
  const [todayAmount, setTodayAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadTodayWater = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const amount = await getWaterByDate(today, user?.id);
      setTodayAmount(amount);
    } catch (error) {
      console.error("Error loading water:", error);
    }
  };

  useEffect(() => {
    loadTodayWater();
  }, []);

  const handleAddWater = async (amount: number) => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      await saveWater({
        userId: user?.id || null,
        amount,
        date: today,
      });

      await loadTodayWater();
    } catch (error) {
      Alert.alert(t("common.error"), t("health.saveError"));
    } finally {
      setLoading(false);
    }
  };

  const getProgress = () => {
    const target = 2000; // 2 литра в день
    return Math.min((todayAmount / target) * 100, 100);
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
    content: {
      padding: 16,
      paddingBottom: 40,
    },
    progressCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 24,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    progressTitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    progressAmount: {
      fontSize: 32,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 16,
    },
    progressBar: {
      width: "100%",
      height: 20,
      backgroundColor: colors.lightGray,
      borderRadius: 10,
      overflow: "hidden",
      marginBottom: 8,
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.primary,
      borderRadius: 10,
    },
    progressPercent: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
    },
    buttonsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 16,
    },
    waterButton: {
      flex: 1,
      minWidth: "30%",
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    waterButtonText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.text,
      marginTop: 8,
    },
    customButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 16,
      alignItems: "center",
    },
    customButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
    },
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("health.water")}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.progressCard}>
        <Text style={styles.progressTitle}>{t("health.waterToday")}</Text>
        <Text style={styles.progressAmount}>
          {todayAmount} {t("health.ml")} / 2000 {t("health.ml")}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${getProgress()}%` },
            ]}
          />
        </View>
        <Text style={styles.progressPercent}>
          {Math.round(getProgress())}%
        </Text>
      </View>

      <Text style={styles.sectionTitle}>{t("health.waterAdd")}</Text>
      <View style={styles.buttonsGrid}>
        {WATER_AMOUNTS.map((amount) => (
          <TouchableOpacity
            key={amount}
            style={styles.waterButton}
            onPress={() => handleAddWater(amount)}
            disabled={loading}
          >
            <MaterialCommunityIcons name="cup-water" size={24} color={colors.primary} />
            <Text style={styles.waterButtonText}>{amount} {t("health.ml")}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.customButton}
        onPress={() => {
          Alert.prompt(
            t("health.waterAddPrompt"),
            t("health.waterAddPromptMessage"),
            [
              { text: t("common.cancel"), style: "cancel" },
              {
                text: t("common.add"),
                onPress: async (value?: string) => {
                  const parsed = value ? parseFloat(value) : NaN;
                  if (!isNaN(parsed)) {
                    await handleAddWater(parsed);
                  }
                },
              },
            ],
            "plain-text",
            "",
            "numeric"
          );
        }}
      >
        <Text style={styles.customButtonText}>{t("health.waterCustom")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
