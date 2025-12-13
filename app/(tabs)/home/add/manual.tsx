import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState, useEffect, useRef } from "react";
import { Alert, BackHandler, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../../../../src/theme/colors";
import { useLanguage } from "../../../../src/context/LanguageContext";
import { saveMedicine , getAllMedicines } from "../../../../src/database/medicine.service";
import { useAuthStore } from "../../../../src/store/authStore";
import { checkMedicineAllergies, AllergyCheckResult, AllergyMatch } from "../../../../src/services/allergy-check.service";
import { checkAllergiesInText } from "../../../../src/services/allergy-check-realtime.service";
import AllergyWarning from "../../../../src/components/AllergyWarning";
import HighlightedText from "../../../../src/components/HighlightedText";
import { 
  getMedicineCompatibilityInfo, 
  checkMedicineCompatibility,
  checkContraindications,
  checkDangerousInteractions,
  UserMedicalConditions
} from "../../../../src/services/medicine-compatibility.service";
import ExpiryDatePicker from "../../../../src/components/ExpiryDatePicker";

export default function ManualAddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t, language } = useLanguage();
  const { user } = useAuthStore();

  // Обработка системной кнопки "Назад" (Android)
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Возвращаемся на экран выбора способа добавления
        router.back();
        return true; // Предотвращаем стандартное поведение
      };

      // Добавляем обработчик
      const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress);

      // Удаляем обработчик при размонтировании
      return () => backHandler.remove();
    }, [router])
  );

  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [form, setForm] = useState("");
  const [expiry, setExpiry] = useState("");
  const [loading, setLoading] = useState(false);
  const [allergyResult, setAllergyResult] = useState<AllergyCheckResult | null>(null);
  const [showAllergyWarning, setShowAllergyWarning] = useState(false);
  const [realTimeAllergyMatches, setRealTimeAllergyMatches] = useState<AllergyMatch[]>([]);
  const [checkingAllergies, setCheckingAllergies] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [takeWithFood, setTakeWithFood] = useState("");
  const [totalPills, setTotalPills] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("10");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
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

  const handleAutoFill = async () => {
    if (!name.trim() || !user?.id) {
      Alert.alert(t("common.error"), "Введите название лекарства");
      return;
    }

    setAutoFilling(true);
    try {
      const compatibilityInfo = await getMedicineCompatibilityInfo(name.trim(), language);
      
      // Заполняем поля автоматически
      if (compatibilityInfo.incompatibleMedicines) {
        // Сохраняем для проверки совместимости
      }
      
      Alert.alert(
        "Информация получена",
        "Детальная информация о лекарстве будет доступна после сохранения. Проверьте совместимость в разделе деталей лекарства.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error auto-filling:", error);
      Alert.alert("Ошибка", "Не удалось получить информацию автоматически");
    } finally {
      setAutoFilling(false);
    }
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
      // Используем активные ингредиенты из compatibilityInfo, если они есть
      const compatibilityInfo = await getMedicineCompatibilityInfo(name.trim(), language);
      const activeIngredients = (compatibilityInfo as any)?.activeIngredients;
      const allergyCheck = await checkMedicineAllergies(
        name.trim(),
        user.id,
        user.allergies || undefined,
        user.name || undefined,
        activeIngredients
      );

      // Показываем предупреждение, если есть аллергии
      if (allergyCheck.hasAllergies) {
        setAllergyResult(allergyCheck);
        setShowAllergyWarning(true);
        setLoading(false);
        return;
      }

      // compatibilityInfo уже получен выше, используем его

      // Проверяем взаимодействия с едой и аллергии на продукты
      const { checkFoodMedicineInteractions } = await import("../../../../src/services/food-allergy-check.service");
      const foodInteractionsCheck = await checkFoodMedicineInteractions(
        compatibilityInfo,
        user.id,
        user.allergies || undefined,
        user.name || undefined
      );

      // Показываем предупреждение о взаимодействиях с едой
      if (foodInteractionsCheck.hasAllergies || foodInteractionsCheck.warnings.length > 0) {
        const criticalWarnings = foodInteractionsCheck.warnings.filter(w => w.severity === "critical");
        const criticalAllergies = foodInteractionsCheck.matches.filter(m => m.severity === "critical");

        if (criticalAllergies.length > 0 || criticalWarnings.length > 0) {
          const messages: string[] = [];
          
          if (criticalAllergies.length > 0) {
            messages.push(`🚨 КРИТИЧЕСКИЕ АЛЛЕРГИИ НА ПРОДУКТЫ:\n${criticalAllergies.map(m => `• ${m.food} - аллергия у ${m.memberName}`).join("\n")}`);
          }
          
          if (criticalWarnings.length > 0) {
            messages.push(`⚠️ КРИТИЧЕСКИЕ ВЗАИМОДЕЙСТВИЯ С ЕДОЙ:\n${criticalWarnings.map(w => `• ${w.food}: ${w.message}`).join("\n")}`);
          }

          Alert.alert(
            "🚨 Критическое предупреждение",
            messages.join("\n\n") + "\n\nНЕОБХОДИМО проконсультироваться с врачом!",
            [
              { text: "Отмена", style: "cancel", onPress: () => { setLoading(false); } },
              {
                text: "Понятно, продолжить",
                style: "destructive",
                onPress: async () => {
                  await saveMedicineData(compatibilityInfo);
                },
              },
            ]
          );
          return;
        } else if (foodInteractionsCheck.warnings.length > 0 || foodInteractionsCheck.matches.length > 0) {
          const messages: string[] = [];
          
          if (foodInteractionsCheck.matches.length > 0) {
            messages.push(`Аллергии на продукты:\n${foodInteractionsCheck.matches.map(m => `• ${m.food} - ${m.memberName}`).join("\n")}`);
          }
          
          if (foodInteractionsCheck.warnings.length > 0) {
            messages.push(`Взаимодействия с едой:\n${foodInteractionsCheck.warnings.map(w => `• ${w.food}: ${w.message}`).join("\n")}`);
          }

          Alert.alert(
            "⚠️ Предупреждение о взаимодействиях с едой",
            messages.join("\n\n") + "\n\nРекомендуется проконсультироваться с врачом.",
            [
              { text: "Отмена", style: "cancel", onPress: () => { setLoading(false); } },
              {
                text: "Понятно, продолжить",
                onPress: async () => {
                  await saveMedicineData(compatibilityInfo);
                },
              },
            ]
          );
          return;
        }
      }

      // Проверяем совместимость перед сохранением
      const compatibilityCheck = await checkMedicineCompatibility(
        name.trim(), 
        user.id,
        compatibilityInfo
      );
      
      if (compatibilityCheck.incompatible.length > 0) {
        const incompatibleNames = compatibilityCheck.incompatible.map(m => m.medicineName).join(", ");
        Alert.alert(
          "⚠️ Несовместимые препараты",
          `Это лекарство несовместимо с: ${incompatibleNames}\n\nРекомендуется проконсультироваться с врачом.`,
          [
            { text: "Отмена", style: "cancel", onPress: () => { setLoading(false); } },
            { 
              text: "Сохранить anyway", 
              onPress: async () => {
                await saveMedicineData(compatibilityInfo);
              }
            }
          ]
        );
        return;
      }

      // Проверяем опасные взаимодействия
      const existingMedicines = await getAllMedicines(user.id);
      const dangerousInteractions = checkDangerousInteractions(compatibilityInfo, existingMedicines as any[]);
      
      if (dangerousInteractions.length > 0) {
        const interactionNames = dangerousInteractions.map(i => i.medicineName).join(", ");
        const severity = dangerousInteractions.some(i => i.severity === "critical") ? "critical" : "high";
        Alert.alert(
          severity === "critical" ? "🚨 Критическое взаимодействие" : "⚠️ Опасное взаимодействие",
          `Обнаружено ${severity === "critical" ? "критическое" : "опасное"} взаимодействие с: ${interactionNames}\n\n${dangerousInteractions[0].description}\n\nНЕОБХОДИМО проконсультироваться с врачом!`,
          [
            { text: "Отмена", style: "cancel", onPress: () => { setLoading(false); } },
            { 
              text: "Сохранить anyway", 
              style: severity === "critical" ? "destructive" : "default",
              onPress: async () => {
                await saveMedicineData(compatibilityInfo);
              }
            }
          ]
        );
        return;
      }

      // Проверяем противопоказания на основе медицинских состояний пользователя
      const contraindicationsCheck = checkContraindications(compatibilityInfo, user);
      
      if (contraindicationsCheck.hasContraindications) {
        const criticalWarnings = contraindicationsCheck.warnings.filter(w => w.severity === "critical");
        const highWarnings = contraindicationsCheck.warnings.filter(w => w.severity === "high");
        
        if (criticalWarnings.length > 0 || highWarnings.length > 0) {
          const messages = contraindicationsCheck.warnings
            .filter(w => w.severity === "critical" || w.severity === "high")
            .map(w => `• ${w.condition}: ${w.message}`)
            .join("\n");
          
          Alert.alert(
            "🚨 Критические противопоказания",
            `Внимание! У вас есть состояния, при которых это лекарство противопоказано:\n\n${messages}\n\nНЕОБХОДИМО проконсультироваться с врачом!`,
            [
              { text: "Отмена", style: "cancel", onPress: () => { setLoading(false); } },
              { 
                text: "Сохранить anyway", 
                style: "destructive",
                onPress: async () => {
                  await saveMedicineData(compatibilityInfo);
                }
              }
            ]
          );
          return;
        } else if (contraindicationsCheck.warnings.length > 0) {
          const messages = contraindicationsCheck.warnings.map(w => `• ${w.condition}: ${w.message}`).join("\n");
          Alert.alert(
            "⚠️ Противопоказания",
            `Внимание! У вас есть состояния, при которых требуется осторожность:\n\n${messages}\n\nПроконсультируйтесь с врачом перед приемом.`,
            [
              { text: "Отмена", style: "cancel", onPress: () => { setLoading(false); } },
              { 
                text: "Понятно, сохранить", 
                onPress: async () => {
                  await saveMedicineData(compatibilityInfo);
                }
              }
            ]
          );
          return;
        }
      } else if (compatibilityInfo.contraindications) {
        // Общие противопоказания, если нет специфических для пользователя
        Alert.alert(
          "⚠️ Противопоказания",
          `Внимание! У этого лекарства есть противопоказания:\n\n${compatibilityInfo.contraindications}\n\nПроконсультируйтесь с врачом перед приемом.`,
          [
            { text: "Отмена", style: "cancel", onPress: () => { setLoading(false); } },
            { 
              text: "Понятно, сохранить", 
              onPress: async () => {
                await saveMedicineData(compatibilityInfo);
              }
            }
          ]
        );
        return;
      }

      await saveMedicineData(compatibilityInfo);
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

  // Преобразование ММ.ГГГГ в полную дату (последний день месяца)
  const convertMonthYearToFullDate = (monthYear: string): string | null => {
    if (!monthYear || monthYear.trim() === "" || monthYear === ".") return null;
    
    // Поддерживаем форматы: ММ.ГГГГ, ММ-ГГГГ, ММ/ГГГГ
    const cleaned = monthYear.trim().replace(/[.\-\/]/g, ".");
    const parts = cleaned.split(".").filter(p => p !== "");
    
    if (parts.length !== 2) {
      // Если формат не ММ.ГГГГ, возвращаем null
      return null;
    }
    
    const month = parseInt(parts[0]);
    const year = parseInt(parts[1]);
    
    if (isNaN(month) || isNaN(year) || month < 1 || month > 12 || year < 2000 || year > 2100) {
      return null; // Возвращаем null, если невалидно
    }
    
    // Получаем последний день месяца
    const lastDay = new Date(year, month, 0).getDate();
    
    // Форматируем как ГГГГ-ММ-ДД
    return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  };

  const saveMedicineData = async (compatibilityInfo?: any) => {
    if (!user?.id || !name.trim()) return;

    try {
      // Если информация о совместимости не передана, получаем её
      if (!compatibilityInfo) {
        compatibilityInfo = await getMedicineCompatibilityInfo(name.trim(), language);
      }

      // Преобразуем ММ.ГГГГ в полную дату
      const expiryToSave = expiry.trim() ? convertMonthYearToFullDate(expiry.trim()) : null;

      // Сохраняем противопоказания как JSON строку
      const contraindicationsJson = compatibilityInfo.contraindicationsByCondition 
        ? JSON.stringify(compatibilityInfo.contraindicationsByCondition)
        : null;

      await saveMedicine({
        name: name.trim(),
        dose: dose.trim() || null,
        form: form.trim() || null,
        expiry: expiryToSave,
        photoUri: null,
        userId: user.id,
        takeWithFood: takeWithFood.trim() || null,
        takeWithLiquid: null,
        incompatibleMedicines: compatibilityInfo.incompatibleMedicines || null,
        compatibleMedicines: compatibilityInfo.compatibleMedicines || null,
        forbiddenFoods: compatibilityInfo.forbiddenFoods || null,
        recommendedFoods: compatibilityInfo.recommendedFoods || null,
        alcoholInteraction: compatibilityInfo.alcoholInteraction || null,
        caffeineInteraction: compatibilityInfo.caffeineInteraction || null,
        storageConditions: null,
        specialInstructions: null,
        sideEffects: compatibilityInfo.sideEffects || null,
        contraindications: compatibilityInfo.contraindications || contraindicationsJson || null,
        totalPills: totalPills.trim() ? parseInt(totalPills.trim()) || null : null,
        usedPills: 0,
        lowStockThreshold: lowStockThreshold.trim() ? parseInt(lowStockThreshold.trim()) || 10 : 10,
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

  const handleSaveAnyway = async () => {
    setLoading(true);
    try {
      await saveMedicineData();

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
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <TextInput 
                  placeholder={t("manual.name")} 
                  placeholderTextColor={colors.textSecondary}
                  style={[
                    styles.input,
                    { flex: 1 },
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
                {name.trim().length > 2 && (
                  <TouchableOpacity
                    onPress={handleAutoFill}
                    disabled={autoFilling}
                    style={{
                      padding: 8,
                      backgroundColor: colors.primary + "20",
                      borderRadius: 8,
                    }}
                  >
                    {autoFilling ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <MaterialCommunityIcons name="robot" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
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
            <View style={styles.inputWrapper}>
              <ExpiryDatePicker
                value={expiry}
                onChange={(value) => setExpiry(value)}
                placeholder={t("manual.expiry") || "Срок годности"}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <MaterialCommunityIcons name="food" size={22} color={colors.primary} />
            <TextInput 
              placeholder="Время приема относительно еды (до еды, после еды, во время еды, независимо)" 
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              value={takeWithFood}
              onChangeText={setTakeWithFood}
            />
          </View>

          {/* Количество таблеток в упаковке */}
          <View style={styles.inputGroup}>
            <MaterialCommunityIcons name="counter" size={22} color={colors.primary} />
            <View style={styles.inputWrapper}>
              <TextInput 
                placeholder="Количество таблеток в упаковке (опционально)" 
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
                value={totalPills}
                onChangeText={setTotalPills}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Порог для уведомления о низком количестве */}
          {totalPills.trim() && (
            <View style={styles.inputGroup}>
              <MaterialCommunityIcons name="bell-alert" size={22} color={colors.warning} />
              <View style={styles.inputWrapper}>
                <TextInput 
                  placeholder="Уведомлять когда останется (по умолчанию 10)" 
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                  value={lowStockThreshold}
                  onChangeText={setLowStockThreshold}
                  keyboardType="numeric"
                />
              </View>
            </View>
          )}

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
