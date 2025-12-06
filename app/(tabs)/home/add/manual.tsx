import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../../../../src/theme/colors";
import { useLanguage } from "../../../../src/context/LanguageContext";
import { saveMedicine } from "../../../../src/database/medicine.service";
import { useAuthStore } from "../../../../src/store/authStore";
import { checkMedicineAllergies, AllergyCheckResult, AllergyMatch } from "../../../../src/services/allergy-check.service";
import { checkAllergiesInText } from "../../../../src/services/allergy-check-realtime.service";
import AllergyWarning from "../../../../src/components/AllergyWarning";
import HighlightedText from "../../../../src/components/HighlightedText";

export default function ManualAddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();
  const { user } = useAuthStore();

  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [form, setForm] = useState("");
  const [expiry, setExpiry] = useState("");
  const [loading, setLoading] = useState(false);
  const [allergyResult, setAllergyResult] = useState<AllergyCheckResult | null>(null);
  const [showAllergyWarning, setShowAllergyWarning] = useState(false);
  const [realTimeAllergyMatches, setRealTimeAllergyMatches] = useState<AllergyMatch[]>([]);
  const [checkingAllergies, setCheckingAllergies] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  
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
      padding: 20,
      paddingBottom: 40,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      marginBottom: 20,
      color: colors.text,
    },
    inputGroup: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      marginBottom: 16,
      padding: 12,
      borderRadius: 10,
      borderColor: colors.border,
      borderWidth: 1,
    },
    inputWrapper: {
      marginLeft: 10,
      flex: 1,
    },
    input: {
      fontSize: 16,
      color: colors.text,
      paddingVertical: 0,
      paddingHorizontal: 0,
    },
    allergyInfo: {
      marginTop: 8,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
    },
    allergyItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
      gap: 6,
    },
    allergyItemLast: {
      marginBottom: 0,
    },
    allergyText: {
      fontSize: 12,
      flex: 1,
      fontWeight: "500",
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 10,
      marginTop: 10,
      alignItems: "center",
      marginBottom: 20,
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: colors.white,
      fontSize: 18,
      fontWeight: "600",
    },
  });

  // Проверка аллергий в реальном времени при вводе
  useEffect(() => {
    if (!user?.id || !name.trim() || name.trim().length < 2) {
      setRealTimeAllergyMatches([]);
      return;
    }

    // Очищаем предыдущий таймер
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    setCheckingAllergies(true);

    // Debounce проверки (500ms)
    debounceTimer.current = setTimeout(async () => {
      try {
        const matches = await checkAllergiesInText(
          name.trim(),
          user.id,
          user.allergies || undefined,
          user.name || undefined
        );
        setRealTimeAllergyMatches(matches);
      } catch (error) {
        console.error("Error checking allergies in real-time:", error);
        setRealTimeAllergyMatches([]);
      } finally {
        setCheckingAllergies(false);
      }
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [name, user?.id, user?.allergies, user?.name]);

  const handleNameChange = (text: string) => {
    setName(text);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t("common.error"), t("manual.name") + " " + t("common.error"));
      return;
    }

    if (!user?.id) {
      Alert.alert(t("common.error"), t("reminders.userNotFound"));
      return;
    }

    setLoading(true);
    try {
      // Проверяем аллергии перед сохранением
      const allergyCheck = await checkMedicineAllergies(
        name.trim(),
        user.id,
        user.allergies || undefined,
        user.name || undefined
      );

      // Показываем предупреждение, если есть аллергии
      if (allergyCheck.hasAllergies) {
        setAllergyResult(allergyCheck);
        setShowAllergyWarning(true);
        setLoading(false);
        return;
      }

      // Если аллергий нет, сохраняем лекарство
      await saveMedicine({
        name: name.trim(),
        dose: dose.trim() || null,
        form: form.trim() || null,
        expiry: expiry.trim() || null,
        photoUri: null,
        userId: user.id,
      });

      // Показываем успешное сообщение
      setAllergyResult({ ...allergyCheck, hasAllergies: false, severity: "none", matches: [] });
      setShowAllergyWarning(true);
    } catch (error) {
      console.error("Error saving medicine:", error);
      Alert.alert(t("common.error"), t("common.error"));
      setLoading(false);
    }
  };

  const handleAllergyWarningClose = () => {
    setShowAllergyWarning(false);
    if (allergyResult && !allergyResult.hasAllergies) {
      // Если аллергий не было, закрываем экран
      router.back();
    }
  };

  const handleSaveAnyway = async () => {
    if (!user?.id || !name.trim()) return;

    setLoading(true);
    try {
      await saveMedicine({
        name: name.trim(),
        dose: dose.trim() || null,
        form: form.trim() || null,
        expiry: expiry.trim() || null,
        photoUri: null,
        userId: user.id,
      });

      setShowAllergyWarning(false);
      Alert.alert(t("common.success"), t("scan.success"), [
        {
          text: t("common.ok"),
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Error saving medicine:", error);
      Alert.alert(t("common.error"), t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("manual.title")}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{t("manual.title")}</Text>

          <View style={styles.inputGroup}>
            <MaterialCommunityIcons name="pill" size={22} color={colors.primary} />
            <View style={styles.inputWrapper}>
              <TextInput 
                placeholder={t("manual.name")} 
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.input,
                  realTimeAllergyMatches.length > 0 && {
                    borderColor: realTimeAllergyMatches.some((m) => m.severity === "critical")
                      ? colors.error
                      : colors.warning,
                    borderWidth: 2,
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                  },
                ]}
                value={name}
                onChangeText={handleNameChange}
              />
              {name.trim().length > 0 && (
                <HighlightedText text={name} matches={realTimeAllergyMatches} />
              )}
              {realTimeAllergyMatches.length > 0 && (
                <View style={[
                  styles.allergyInfo, 
                  { 
                    backgroundColor: realTimeAllergyMatches.some((m) => m.severity === "critical")
                      ? colors.error + "10"
                      : colors.warning + "10",
                    borderColor: realTimeAllergyMatches.some((m) => m.severity === "critical")
                      ? colors.error + "40"
                      : colors.warning + "40",
                  }
                ]}>
                  {realTimeAllergyMatches.map((match, index) => (
                    <View 
                      key={index} 
                      style={[
                        styles.allergyItem,
                        index === realTimeAllergyMatches.length - 1 && styles.allergyItemLast
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="alert-circle"
                        size={16}
                        color={match.severity === "critical" ? colors.error : colors.warning}
                      />
                      <Text
                        style={[
                          styles.allergyText,
                          {
                            color: match.severity === "critical" ? colors.error : colors.warning,
                          },
                        ]}
                      >
                        {match.substance} — {t("allergy.allergyIn")} {match.memberName}{" "}
                        {match.severity === "critical" && `(${t("allergy.severe")})`}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <MaterialCommunityIcons name="numeric" size={22} color={colors.primary} />
            <TextInput 
              placeholder={t("manual.dose")} 
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              value={dose}
              onChangeText={setDose}
            />
          </View>

          <View style={styles.inputGroup}>
            <MaterialCommunityIcons name="shape" size={22} color={colors.primary} />
            <TextInput 
              placeholder={t("manual.form")} 
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              value={form}
              onChangeText={setForm}
            />
          </View>

          <View style={styles.inputGroup}>
            <MaterialCommunityIcons name="calendar" size={22} color={colors.primary} />
            <TextInput 
              placeholder={t("manual.expiry")} 
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              value={expiry}
              onChangeText={setExpiry}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? t("common.saving") : t("manual.save")}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <AllergyWarning
        visible={showAllergyWarning}
        result={allergyResult}
        medicineName={name.trim()}
        onClose={handleAllergyWarningClose}
        onViewComposition={() => {
          Alert.alert(
            t("allergy.viewComposition"),
            allergyResult?.allIngredients.join(", ") || ""
          );
        }}
      />
    </>
  );
}
