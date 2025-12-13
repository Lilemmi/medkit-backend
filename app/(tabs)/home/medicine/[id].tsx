import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getDB } from "../../../../src/database/medicine.database";
import { useColors } from "../../../../src/theme/colors";
import { useLanguage } from "../../../../src/context/LanguageContext";
import { getAllMedicines } from "../../../../src/database/medicine.service";
import { useAuthStore } from "../../../../src/store/authStore";
import { checkFoodMedicineInteractions } from "../../../../src/services/food-allergy-check.service";
import { formatExpiryDate } from "../../../../src/utils/date-formatter";
import { getCurrentTemperature, checkStorageTemperature as checkStorageTemp } from "../../../../src/services/temperature.service";
import { calculateDosageForUser } from "../../../../src/services/dosage-calculator.service";
import { getAllFamilyMembers } from "../../../../src/services/family.service";
import { checkMedicineAllergies, AllergyCheckResult } from "../../../../src/services/allergy-check.service";

export default function MedicineDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t, language } = useLanguage();
  const { user } = useAuthStore();

  const [medicine, setMedicine] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [medicineImageUrl, setMedicineImageUrl] = useState<string | null>(null);

  // Функция для возврата в аптечку с закрытием экрана
  const goToMedicines = useCallback(() => {
    // Сначала закрываем экран в стеке home
    if (router.canGoBack()) {
      router.back();
    }
    // Затем переключаемся на вкладку аптечки
    // Используем requestAnimationFrame для более плавного перехода
    requestAnimationFrame(() => {
      router.replace("/(tabs)/medicines");
    });
  }, [router]);

  // Обработка системной кнопки "Назад" (Android)
  // Всегда возвращаемся в аптечку при выходе из деталей лекарства
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        goToMedicines();
        return true;
      };

      // Добавляем обработчик
      const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress);

      // Удаляем обработчик при размонтировании
      return () => backHandler.remove();
    }, [goToMedicines])
  );

  const [compatibilityCheck, setCompatibilityCheck] = useState<{
    incompatible: { medicineName: string; reason: string; severity: string }[];
    warnings: { medicineName: string; message: string }[];
  } | null>(null);
  const [foodInteractionsCheck, setFoodInteractionsCheck] = useState<{
    hasAllergies: boolean;
    severity: "critical" | "medium" | "low" | "none";
    matches: { food: string; memberName: string; severity: string; reason?: string }[];
    warnings: { food: string; message: string; severity: string }[];
  } | null>(null);
  const [calculatedDosage, setCalculatedDosage] = useState<{
    recommendedDosage: string;
    calculationDetails: string[];
    warnings: string[];
  } | null>(null);
  const [allergyCheck, setAllergyCheck] = useState<AllergyCheckResult | null>(null);

  useEffect(() => {
    loadMedicine();
  }, [id]);

  useEffect(() => {
    if (medicine && user?.id) {
      // Используем сохраненные данные вместо вызова ИИ
      checkCompatibilityFromSavedData();
      checkFoodInteractions();
      checkStorageTemperature();
      calculateUserDosage();
      checkAllergies();
      
      // Используем фото из базы данных (локальное или из интернета)
      if (medicine.photoUri) {
        // Для Android: если URI начинается с /storage/, добавляем file://
        let photoUri = medicine.photoUri;
        if (Platform.OS === 'android' && photoUri.startsWith('/storage/')) {
          photoUri = `file://${photoUri}`;
        }
        setMedicineImageUrl(photoUri);
      }
    }
  }, [medicine, user?.id]);


  async function loadMedicine() {
    if (!id) return;

    try {
      setLoading(true);
      const db = await getDB();
      const med = await db.getFirstAsync(
        `SELECT * FROM medicines WHERE id = ?`,
        [parseInt(id)]
      );

      if (med) {
        // Вспомогательная функция для безопасного парсинга JSON
        const safeParseJSON = (value: any): any => {
          if (!value) return null;
          if (typeof value === 'object') return value;
          if (typeof value !== 'string') return value;
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        };

        // Парсим JSON поля
        const parsed = {
          ...med,
          incompatibleMedicines: (() => {
            const parsed = safeParseJSON(med.incompatibleMedicines);
            if (Array.isArray(parsed)) return parsed;
            if (parsed && typeof parsed === 'string') {
              try {
                const jsonParsed = JSON.parse(parsed);
                return Array.isArray(jsonParsed) ? jsonParsed : [];
              } catch {
                return [];
              }
            }
            return [];
          })(),
          compatibleMedicines: (() => {
            const parsed = safeParseJSON(med.compatibleMedicines);
            if (Array.isArray(parsed)) return parsed;
            if (parsed && typeof parsed === 'string') {
              try {
                const jsonParsed = JSON.parse(parsed);
                return Array.isArray(jsonParsed) ? jsonParsed : [];
              } catch {
                return [];
              }
            }
            return [];
          })(),
          forbiddenFoods: safeParseJSON(med.forbiddenFoods) || [],
          recommendedFoods: safeParseJSON(med.recommendedFoods) || [],
          activeIngredients: safeParseJSON(med.activeIngredients) || [],
          // Новые расширенные поля
          indications: safeParseJSON(med.indications),
          contraindicationsDetailed: safeParseJSON(med.contraindicationsDetailed),
          warnings: safeParseJSON(med.warnings),
          foodCompatibility: safeParseJSON(med.foodCompatibility),
          drugCompatibility: safeParseJSON(med.drugCompatibility),
          dosageDetailed: safeParseJSON(med.dosageDetailed),
          childrenRestrictions: safeParseJSON(med.childrenRestrictions),
          sideEffectsDetailed: safeParseJSON(med.sideEffectsDetailed),
          storageConditionsDetailed: safeParseJSON(med.storageConditionsDetailed),
          additionalRecommendations: safeParseJSON(med.additionalRecommendations),
          specialGroupsInfo: safeParseJSON(med.specialGroupsInfo),
          analogs: safeParseJSON(med.analogs),
        };
        
        // Логируем только при необходимости (для отладки можно включить)
        // console.log("📋 Загруженное лекарство:", {
        //   name: parsed.name,
        //   hasStorageConditions: !!parsed.storageConditions,
        //   hasStorageConditionsDetailed: !!parsed.storageConditionsDetailed,
        //   hasSideEffects: !!parsed.sideEffects,
        //   hasSideEffectsDetailed: !!parsed.sideEffectsDetailed,
        //   hasDrugCompatibility: !!parsed.drugCompatibility,
        //   hasIncompatibleMedicines: !!parsed.incompatibleMedicines,
        //   hasCompatibleMedicines: !!parsed.compatibleMedicines,
        // });
        
        setMedicine(parsed);
      }
    } catch (error) {
      console.error("Error loading medicine:", error);
      Alert.alert(t("common.error"), "Не удалось загрузить информацию о лекарстве");
    } finally {
      setLoading(false);
    }
  }

  async function checkStorageTemperature() {
    if (!medicine?.storageConditions) return;

    try {
      // Получаем текущую температуру
      const tempResult = await getCurrentTemperature();
      const currentTemp = tempResult.temperature;

      // Проверяем условия хранения
      const checkResult = checkStorageTemp(
        currentTemp,
        medicine.storageConditions
      );

      if (!checkResult.isSafe && checkResult.warning) {
        Alert.alert(
          `⚠️ ${t("medicines.storageTemperature.title")}`,
          `${checkResult.warning}\n\n${t("medicines.storageTemperature.recommendation")}`,
          [{ text: t("common.ok") }]
        );
      }
    } catch (error) {
      console.error("Ошибка проверки температуры хранения:", error);
      // Не показываем ошибку пользователю, чтобы не мешать
    }
  }

  async function checkCompatibilityFromSavedData() {
    if (!medicine || !user?.id) return;

    try {
      // Получаем все лекарства пользователя для проверки совместимости
      const allMedicines = await getAllMedicines(user.id);
      
      const incompatible: { medicineName: string; reason: string; severity: string }[] = [];
      const warnings: { medicineName: string; message: string }[] = [];

      // Проверяем несовместимость на основе сохраненных данных
      const incompatibleList = Array.isArray(medicine.incompatibleMedicines) 
        ? medicine.incompatibleMedicines 
        : (typeof medicine.incompatibleMedicines === 'string' 
            ? (medicine.incompatibleMedicines.trim() ? JSON.parse(medicine.incompatibleMedicines) : [])
            : []);
      
      if (incompatibleList && incompatibleList.length > 0) {
        for (const existingMed of allMedicines) {
          if (existingMed.id === medicine.id) continue; // Пропускаем текущее лекарство
          
          const existingName = existingMed.name?.toLowerCase().trim() || "";
          
          for (const incompatibleName of incompatibleList) {
            const incompatibleNameStr = typeof incompatibleName === 'string' ? incompatibleName : incompatibleName.medicineName || incompatibleName;
            if (existingName.includes(incompatibleNameStr.toLowerCase()) || 
                incompatibleNameStr.toLowerCase().includes(existingName)) {
              incompatible.push({
                medicineName: existingMed.name,
                reason: `Несовместимо с ${medicine.name}`,
                severity: "critical",
              });
            }
          }
        }
      }

      // Проверяем существующие лекарства на несовместимость с текущим
      for (const existingMed of allMedicines) {
        if (existingMed.id === medicine.id) continue;
        if (!existingMed.incompatibleMedicines) continue;
        
        try {
          const incompatibleList = JSON.parse(existingMed.incompatibleMedicines);
          if (Array.isArray(incompatibleList)) {
            for (const incompatibleName of incompatibleList) {
              if (medicine.name.toLowerCase().includes(incompatibleName.toLowerCase()) ||
                  incompatibleName.toLowerCase().includes(medicine.name.toLowerCase())) {
                incompatible.push({
                  medicineName: existingMed.name,
                  reason: `Несовместимо с ${incompatibleName}`,
                  severity: "critical",
                });
              }
            }
          }
        } catch (e) {
          // Игнорируем ошибки парсинга
        }
      }

      setCompatibilityCheck({ incompatible, warnings });
    } catch (error) {
      console.error("Error checking compatibility from saved data:", error);
    }
  }

  async function calculateUserDosage() {
    if (!medicine || !user?.id) return;

    try {
      // Определяем, для кого лекарство
      let targetUser: any = null;
      
      if (medicine.familyMemberId) {
        // Лекарство для члена семьи
        const familyMembers = await getAllFamilyMembers();
        targetUser = familyMembers.find((m: any) => m.id === medicine.familyMemberId);
      } else {
        // Лекарство для текущего пользователя - загружаем полный профиль
        try {
          const { fetchProfileApi } = await import("../../../../src/api/auth");
          const fullProfile = await fetchProfileApi();
          targetUser = fullProfile || user;
        } catch (e) {
          // Если не удалось загрузить профиль, используем данные из store
          console.log("Не удалось загрузить полный профиль, используем данные из store");
          targetUser = user;
        }
      }
      
      if (!targetUser) {
        setCalculatedDosage(null);
        return;
      }
      
      // Получаем характеристики пользователя
      const userCharacteristics = {
        birthDate: targetUser.birthDate || targetUser.birthdate || null,
        weight: targetUser.weight || null,
        height: targetUser.height || null,
        gender: targetUser.gender || null,
        chronicDiseases: Array.isArray(targetUser.chronicDiseases) 
          ? targetUser.chronicDiseases 
          : (typeof targetUser.chronicDiseases === 'string' 
              ? (targetUser.chronicDiseases.trim() ? JSON.parse(targetUser.chronicDiseases) : null)
              : null),
        medicalConditions: Array.isArray(targetUser.medicalConditions)
          ? targetUser.medicalConditions
          : (typeof targetUser.medicalConditions === 'string'
              ? (targetUser.medicalConditions.trim() ? JSON.parse(targetUser.medicalConditions) : null)
              : null),
        organConditions: Array.isArray(targetUser.organConditions)
          ? targetUser.organConditions
          : (typeof targetUser.organConditions === 'string'
              ? (targetUser.organConditions.trim() ? JSON.parse(targetUser.organConditions) : null)
              : null),
      };
      
      // Рассчитываем дозировку
      const dosageResult = calculateDosageForUser(
        medicine.dose || medicine.userDosage,
        medicine.name || "Лекарство",
        userCharacteristics
      );
      
      setCalculatedDosage(dosageResult);
    } catch (error) {
      console.error("Error calculating dosage:", error);
      setCalculatedDosage(null);
    }
  }

  async function checkAllergies() {
    if (!medicine || !user?.id) return;

    try {
      // Извлекаем активные ингредиенты из лекарства
      let activeIngredients = null;
      if (medicine.activeIngredients) {
        if (Array.isArray(medicine.activeIngredients)) {
          activeIngredients = medicine.activeIngredients.map((ing: any) => {
            if (typeof ing === 'string') return ing;
            if (ing && typeof ing === 'object' && ing.name) return ing.name;
            return String(ing);
          });
        } else if (typeof medicine.activeIngredients === 'string') {
          try {
            const parsed = JSON.parse(medicine.activeIngredients);
            if (Array.isArray(parsed)) {
              activeIngredients = parsed.map((ing: any) => {
                if (typeof ing === 'string') return ing;
                if (ing && typeof ing === 'object' && ing.name) return ing.name;
                return String(ing);
              });
            }
          } catch {
            // Если не JSON, игнорируем
          }
        }
      }

      const result = await checkMedicineAllergies(
        medicine.name || "",
        user.id,
        user.allergies || undefined,
        user.name || undefined,
        activeIngredients
      );

      setAllergyCheck(result);
    } catch (error) {
      console.error("Error checking allergies:", error);
      setAllergyCheck(null);
    }
  }

  async function checkFoodInteractions() {
    if (!medicine || !user?.id) return;

    try {
      // Парсим сохраненные данные о взаимодействиях с едой
      const compatibilityInfo: any = {};

      // Парсим запрещенные продукты
      if (medicine.forbiddenFoods) {
        try {
          const parsed = JSON.parse(medicine.forbiddenFoods);
          compatibilityInfo.forbiddenFoods = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          // Если не JSON, пытаемся разбить по запятой или использовать как массив
          if (typeof medicine.forbiddenFoods === 'string') {
            compatibilityInfo.forbiddenFoods = medicine.forbiddenFoods.includes(',') 
              ? medicine.forbiddenFoods.split(',').map((f: string) => f.trim())
              : [medicine.forbiddenFoods];
          } else {
            compatibilityInfo.forbiddenFoods = medicine.forbiddenFoods;
          }
        }
      }

      // Добавляем специальные взаимодействия
      if (medicine.alcoholInteraction && medicine.alcoholInteraction !== "не указано") {
        compatibilityInfo.alcoholInteraction = medicine.alcoholInteraction;
      }

      if (medicine.caffeineInteraction && medicine.caffeineInteraction !== "не указано") {
        compatibilityInfo.caffeineInteraction = medicine.caffeineInteraction;
      }

      // Проверяем взаимодействия с едой и аллергии
      const foodCheck = await checkFoodMedicineInteractions(
        compatibilityInfo,
        user.id,
        user.allergies || undefined,
        user.name || undefined
      );

      setFoodInteractionsCheck(foodCheck);
    } catch (error) {
      console.error("Error checking food interactions:", error);
    }
  }


  const getPillWord = (count: number): string => {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return "таблеток";
    }

    if (lastDigit === 1) {
      return "таблетка";
    } else if (lastDigit >= 2 && lastDigit <= 4) {
      return "таблетки";
    } else {
      return "таблеток";
    }
  };

  // Проверяет, является ли текст плейсхолдером "не видно на упаковке"
  const isPlaceholderText = (text: string): boolean => {
    if (!text || typeof text !== 'string') return false;
    const lowerText = text.toLowerCase().trim();
    const placeholders = [
      'not visible on packaging',
      'not visible',
      'не видно на упаковке',
      'не указано',
      'не указано на упаковке',
      'информация не указана',
      '—',
      '-',
      'null',
      'undefined',
      '',
    ];
    // Используем точное совпадение или проверяем, что текст состоит ТОЛЬКО из плейсхолдера
    // Не используем includes, чтобы не фильтровать строки, которые содержат плейсхолдер как часть
    return placeholders.some(placeholder => {
      if (lowerText === placeholder) return true;
      // Проверяем только если текст начинается и заканчивается плейсхолдером (для коротких строк)
      if (placeholder.length > 3 && lowerText.length < 50) {
        return lowerText.startsWith(placeholder) || lowerText.endsWith(placeholder);
      }
      return false;
    });
  };

  // Преобразует псевдо-JSON в валидный JSON
  const convertPseudoJSON = (text: string): string | null => {
    if (!text || typeof text !== 'string') return null;
    
    // Проверяем, является ли это псевдо-JSON (формат {key=value, key2=value2})
    if (!text.includes('=') || !text.startsWith('{')) return null;
    
    try {
      // Извлекаем содержимое фигурных скобок
      const match = text.match(/\{([\s\S]*)\}/);
      if (!match) return null;
      
      const content = match[1];
      const pairs: string[] = [];
      
      // Разбиваем на пары key=value, учитывая запятые внутри значений
      let currentPair = '';
      let depth = 0; // Для отслеживания вложенных скобок
      
      for (let i = 0; i < content.length; i++) {
        const char = content[i];
        
        if (char === '[' || char === '{') {
          depth++;
          currentPair += char;
        } else if (char === ']' || char === '}') {
          depth--;
          currentPair += char;
        } else if (char === ',' && depth === 0) {
          // Запятая на верхнем уровне - разделитель пар
          if (currentPair.trim()) {
            pairs.push(currentPair.trim());
          }
          currentPair = '';
        } else {
          currentPair += char;
        }
      }
      
      // Добавляем последнюю пару
      if (currentPair.trim()) {
        pairs.push(currentPair.trim());
      }
      
      // Преобразуем каждую пару
      const jsonPairs = pairs.map(pair => {
        const equalIndex = pair.indexOf('=');
        if (equalIndex === -1) return null;
        
        const key = pair.substring(0, equalIndex).trim();
        let value = pair.substring(equalIndex + 1).trim();
        
        // Обрабатываем пустые значения
        if (!value || value === '') {
          return `"${key}": ""`;
        }
        
        // Обрабатываем массивы
        if (value.startsWith('[') && value.endsWith(']')) {
          return `"${key}": ${value}`;
        }
        
        // Обрабатываем объекты
        if (value.startsWith('{') && value.endsWith('}')) {
          return `"${key}": ${value}`;
        }
        
        // Обычные строковые значения - экранируем кавычки и оборачиваем
        value = value.replace(/"/g, '\\"');
        return `"${key}": "${value}"`;
      }).filter(p => p !== null);
      
      return `{${jsonPairs.join(', ')}}`;
    } catch {
      return null;
    }
  };

  // Пытается распарсить JSON строку (включая псевдо-JSON)
  const tryParseJSON = (text: string): any => {
    if (!text || typeof text !== 'string') return null;
    
    try {
      // Удаляем возможные markdown обертки
      let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      // Пытаемся найти JSON объект в строке
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        cleaned = match[0];
      }
      
      // Сначала пытаемся распарсить как обычный JSON
      try {
        return JSON.parse(cleaned);
      } catch {
        // Если не получилось, пытаемся преобразовать псевдо-JSON
        const converted = convertPseudoJSON(cleaned);
        if (converted) {
          try {
            return JSON.parse(converted);
          } catch {
            // Если и это не сработало, возвращаем null
            return null;
          }
        }
        return null;
      }
    } catch {
      return null;
    }
  };

  // Форматирует данные для отображения
  const formatContentForDisplay = (content: string | string[] | null): string[] | null => {
    if (!content) return null;
    
    const items = Array.isArray(content) ? content : [content];
    const formatted: string[] = [];
    
    for (const item of items) {
      if (!item || typeof item !== 'string') continue;
      
      // Пропускаем плейсхолдеры
      if (isPlaceholderText(item)) continue;
      
      // Пытаемся распарсить как JSON
      const parsed = tryParseJSON(item);
      if (parsed && typeof parsed === 'object') {
        // Если это объект, форматируем его
        const formattedObj = Object.entries(parsed)
          .filter(([_, value]) => value && !isPlaceholderText(String(value)))
          .map(([key, value]) => {
            // Переводим ключи используя локализацию
            const translatedKey = t(`medicineDetails.${key}`) || key;
            return `${translatedKey}: ${value}`;
          });
        
        if (formattedObj.length > 0) {
          formatted.push(...formattedObj);
        }
      } else {
        // Обычный текст
        formatted.push(item);
      }
    }
    
    return formatted.length > 0 ? formatted : null;
  };

  const renderSection = (
    title: string,
    icon: string,
    content: string | string[] | null,
    color: string = colors.primary
  ) => {
    const formattedContent = formatContentForDisplay(content);
    
    if (!formattedContent || formattedContent.length === 0) {
      return null;
    }

    return (
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name={icon as any} size={24} color={color} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        </View>
        {formattedContent.map((item, index) => (
          <Text key={index} style={[styles.sectionText, { color: colors.textSecondary }]}>
            • {item}
          </Text>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={goToMedicines}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Лекарство</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!medicine) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={goToMedicines}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Лекарство</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.text }]}>Лекарство не найдено</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={goToMedicines}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {medicine.name}
        </Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity 
            onPress={() => {
              // Переходим на экран создания напоминания с предзаполненным лекарством
              router.push({
                pathname: "/(tabs)/home/add/reminder",
                params: { medicineId: id, medicineName: medicine.name }
              });
            }}
          >
            <MaterialCommunityIcons name="bell-plus" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(`/(tabs)/home/medicine/${id}/edit`)}>
            <MaterialCommunityIcons name="pencil" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* КРИТИЧЕСКОЕ ПРЕДУПРЕЖДЕНИЕ ОБ АЛЛЕРГИЯХ - В САМОМ ВЕРХУ */}
        {allergyCheck && allergyCheck.hasAllergies && allergyCheck.severity === "critical" && (
          <View style={[
            styles.warningCard, 
            { 
              backgroundColor: colors.error + "20",
              borderColor: colors.error,
              marginBottom: 16
            }
          ]}>
            <View style={styles.warningHeader}>
              <MaterialCommunityIcons 
                name="alert-octagon" 
                size={28} 
                color={colors.error} 
              />
              <Text style={[
                styles.warningTitle, 
                { 
                  color: colors.error,
                  fontSize: 18,
                  fontWeight: "700"
                }
              ]}>
                🚨 КРИТИЧЕСКОЕ ПРЕДУПРЕЖДЕНИЕ
              </Text>
            </View>
            <Text style={[
              styles.warningText, 
              { 
                color: colors.error,
                fontWeight: "600",
                marginBottom: 12,
                fontSize: 16
              }
            ]}>
              В этом лекарстве обнаружены вещества, на которые есть КРИТИЧЕСКАЯ аллергия!
            </Text>
            {allergyCheck.matches.filter(m => m.severity === "critical").map((match, index) => (
              <View key={index} style={{ marginBottom: 10, padding: 12, backgroundColor: colors.error + "10", borderRadius: 8 }}>
                <Text style={[
                  styles.warningText, 
                  { 
                    color: colors.error,
                    fontWeight: "700",
                    fontSize: 15,
                    marginBottom: 4
                  }
                ]}>
                  ⛔ {match.substance}
                </Text>
                <Text style={[
                  styles.warningText, 
                  { 
                    color: colors.error,
                    fontWeight: "600",
                    fontSize: 14
                  }
                ]}>
                  Аллергия у: {match.memberName}
                </Text>
              </View>
            ))}
            {allergyCheck.matches.filter(m => m.severity === "medium").length > 0 && (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.error + "40" }}>
                <Text style={[styles.warningText, { color: colors.warning, fontWeight: "600", marginBottom: 8 }]}>
                  Также возможные аллергии:
                </Text>
                {allergyCheck.matches.filter(m => m.severity === "medium").map((match, index) => (
                  <Text key={index} style={[styles.warningText, { color: colors.warning, marginLeft: 16 }]}>
                    • {match.substance} - у {match.memberName}
                  </Text>
                ))}
              </View>
            )}
            {allergyCheck.allIngredients.length > 0 && (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.error + "40" }}>
                <Text style={[styles.warningText, { color: colors.textSecondary, fontSize: 13 }]}>
                  Все вещества в лекарстве: {allergyCheck.allIngredients.join(", ")}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* КРИТИЧЕСКИЕ ПРЕДУПРЕЖДЕНИЯ О НЕСОВМЕСТИМЫХ ПРЕПАРАТАХ - СРАЗУ ПОСЛЕ АЛЛЕРГИЙ */}
        {compatibilityCheck && compatibilityCheck.incompatible.length > 0 && (
          <View style={[
            styles.warningCard, 
            { 
              backgroundColor: colors.error + "20", 
              borderColor: colors.error,
              marginBottom: 16
            }
          ]}>
            <View style={styles.warningHeader}>
              <MaterialCommunityIcons 
                name="alert-octagon" 
                size={28} 
                color={colors.error} 
              />
              <Text style={[
                styles.warningTitle, 
                { 
                  color: colors.error,
                  fontSize: 18,
                  fontWeight: "700"
                }
              ]}>
                ⚠️ Несовместимые препараты
              </Text>
            </View>
            {compatibilityCheck.incompatible.map((item, index) => (
              <View key={index} style={{ marginBottom: 10, padding: 12, backgroundColor: colors.error + "10", borderRadius: 8 }}>
                <Text style={[
                  styles.warningText, 
                  { 
                    color: colors.error,
                    fontWeight: "700",
                    fontSize: 15,
                    marginBottom: 4
                  }
                ]}>
                  ⛔ {item.medicineName}
                </Text>
                <Text style={[
                  styles.warningText, 
                  { 
                    color: colors.error,
                    fontWeight: "600",
                    fontSize: 14
                  }
                ]}>
                  {item.reason}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* КРИТИЧЕСКИЕ ПРЕДУПРЕЖДЕНИЯ О ВЗАИМОДЕЙСТВИЯХ С ЕДОЙ - СРАЗУ ПОСЛЕ НЕСОВМЕСТИМЫХ ПРЕПАРАТОВ */}
        {foodInteractionsCheck && foodInteractionsCheck.severity === "critical" && (foodInteractionsCheck.hasAllergies || foodInteractionsCheck.warnings.length > 0) && (
          <View style={[
            styles.warningCard, 
            { 
              backgroundColor: colors.error + "20",
              borderColor: colors.error,
              marginBottom: 16
            }
          ]}>
            <View style={styles.warningHeader}>
              <MaterialCommunityIcons 
                name="alert-octagon" 
                size={28} 
                color={colors.error} 
              />
              <Text style={[
                styles.warningTitle, 
                { 
                  color: colors.error,
                  fontSize: 18,
                  fontWeight: "700"
                }
              ]}>
                🚨 КРИТИЧЕСКОЕ ПРЕДУПРЕЖДЕНИЕ: Взаимодействия с едой
              </Text>
            </View>

            {/* Аллергии на продукты */}
            {foodInteractionsCheck.matches.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.warningSubtitle, { color: colors.error, fontWeight: "700", fontSize: 16, marginBottom: 8 }]}>
                  🚨 Аллергии на продукты:
                </Text>
                {foodInteractionsCheck.matches.map((match, index) => (
                  <View key={index} style={{ marginBottom: 10, padding: 12, backgroundColor: colors.error + "10", borderRadius: 8 }}>
                    <Text style={[styles.warningText, { color: colors.error, fontWeight: "700", fontSize: 15 }]}>
                      ⛔ {match.food} - аллергия у {match.memberName} ({match.severity === "critical" ? "критическая" : "средняя"})
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Предупреждения */}
            {foodInteractionsCheck.warnings.filter((w: any) => w.severity === "critical").length > 0 && (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.error + "40" }}>
                <Text style={[styles.warningSubtitle, { color: colors.error, fontWeight: "700", fontSize: 16, marginBottom: 8 }]}>
                  ⚠️ Критические предупреждения:
                </Text>
                {foodInteractionsCheck.warnings.filter((w: any) => w.severity === "critical").map((warning: any, index: number) => (
                  <Text key={index} style={[styles.warningText, { color: colors.error, fontWeight: "600", fontSize: 14 }]}>
                    • {warning.message}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Фото лекарства - локальное или из интернета */}
        {(medicineImageUrl || (medicine.photoUri && medicine.photoUri.trim() !== '')) && (
          <Image 
            source={{ 
              uri: (() => {
                const uri = medicineImageUrl || medicine.photoUri;
                if (!uri) return '';
                // Для Android: если URI начинается с /storage/, добавляем file://
                if (Platform.OS === 'android' && uri.startsWith('/storage/')) {
                  return `file://${uri}`;
                }
                return uri;
              })()
            }} 
            style={[styles.photo, { backgroundColor: colors.lightGray }]}
            resizeMode="cover"
            onError={(error) => {
              console.log(`Ошибка загрузки фото для лекарства ${medicine.id}:`, error.nativeEvent?.error || error);
              console.log(`Попытка загрузить URI: ${medicineImageUrl || medicine.photoUri}`);
              // Если изображение не загрузилось, скрываем его
              setMedicineImageUrl(null);
            }}
            onLoad={() => {
              console.log(`Фото загружено для лекарства ${medicine.id}: ${medicineImageUrl || medicine.photoUri}`);
            }}
          />
        )}

        {/* Основная информация */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.medicineName, { color: colors.text }]}>{medicine.name}</Text>
          {medicine.dose && !isPlaceholderText(medicine.dose) && (
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              💊 {t("medicines.dosage")}: {medicine.dose}
            </Text>
          )}
          {calculatedDosage && (
            <View style={{ marginTop: 12, padding: 12, backgroundColor: colors.primary + "10", borderRadius: 8 }}>
              <Text style={[styles.infoText, { color: colors.primary, fontWeight: "600", marginBottom: 8 }]}>
                💉 Рекомендуемая дозировка для вас: {calculatedDosage.recommendedDosage}
              </Text>
              {calculatedDosage.calculationDetails.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  {calculatedDosage.calculationDetails.map((detail, index) => (
                    <Text key={index} style={[styles.infoText, { color: colors.textSecondary, fontSize: 13 }]}>
                      • {detail}
                    </Text>
                  ))}
                </View>
              )}
              {calculatedDosage.warnings.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  {calculatedDosage.warnings.map((warning, index) => (
                    <Text key={index} style={[styles.infoText, { color: colors.error, fontSize: 13, fontWeight: "600" }]}>
                      {warning}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
          {medicine.userDosage && !calculatedDosage && (
            <Text style={[styles.infoText, { color: colors.primary, fontWeight: "600" }]}>
              💉 Дозировка для пользователя: {medicine.userDosage}
            </Text>
          )}
          {medicine.form && (
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              🧪 {t("medicines.form")}: {medicine.form}
            </Text>
          )}
          {medicine.quantity && (
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              📦 Количество: {medicine.quantity} {medicine.quantity === 1 ? 'упаковка' : medicine.quantity < 5 ? 'упаковки' : 'упаковок'}
            </Text>
          )}
          {medicine.totalPills !== null && medicine.totalPills !== undefined && (
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                💊 Таблеток в упаковке: {medicine.totalPills}
              </Text>
              {medicine.usedPills !== null && medicine.usedPills !== undefined && (
                <>
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    ✅ Использовано: {medicine.usedPills}
                  </Text>
                  <Text style={[
                    styles.infoText, 
                    { 
                      color: (medicine.totalPills - medicine.usedPills) <= (medicine.lowStockThreshold || 10)
                        ? colors.error
                        : colors.textSecondary,
                      fontWeight: (medicine.totalPills - medicine.usedPills) <= (medicine.lowStockThreshold || 10)
                        ? '600'
                        : '400',
                    }
                  ]}>
                    📊 Осталось: {medicine.totalPills - medicine.usedPills} {getPillWord(medicine.totalPills - medicine.usedPills)}
                  </Text>
                  {(medicine.totalPills - medicine.usedPills) <= (medicine.lowStockThreshold || 10) && (
                    <Text style={[styles.infoText, { color: colors.error, marginTop: 4 }]}>
                      ⚠️ Рекомендуется купить новую упаковку
                    </Text>
                  )}
                </>
              )}
            </View>
          )}
          {medicine.expiry && (
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              ⌛ {t("medicines.expiry")}: {formatExpiryDate(medicine.expiry)}
            </Text>
          )}
        </View>

        {/* Предупреждение об аллергиях (не критическое) */}
        {allergyCheck && allergyCheck.hasAllergies && allergyCheck.severity !== "critical" && (
          <View style={[
            styles.warningCard, 
            { 
              backgroundColor: colors.warning + "20",
              borderColor: colors.warning
            }
          ]}>
            <View style={styles.warningHeader}>
              <MaterialCommunityIcons 
                name="alert" 
                size={24} 
                color={colors.warning} 
              />
              <Text style={[
                styles.warningTitle, 
                { 
                  color: colors.warning 
                }
              ]}>
                ⚠️ Предупреждение об аллергии
              </Text>
            </View>
            <Text style={[
              styles.warningText, 
              { 
                color: colors.warning,
                fontWeight: "600",
                marginBottom: 8
              }
            ]}>
              В этом лекарстве обнаружены вещества, на которые возможна аллергия:
              </Text>
            {allergyCheck.matches.map((match, index) => (
              <View key={index} style={{ marginBottom: 8 }}>
                <Text style={[
                  styles.warningText, 
                  { 
                    color: colors.warning,
                    fontWeight: "400"
                  }
                ]}>
                  • {match.substance} - возможная аллергия у {match.memberName}
                </Text>
              </View>
            ))}
            {allergyCheck.allIngredients.length > 0 && (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text style={[styles.warningText, { color: colors.textSecondary, fontSize: 13 }]}>
                  Все вещества в лекарстве: {allergyCheck.allIngredients.join(", ")}
                </Text>
              </View>
            )}
          </View>
        )}


        {/* Предупреждения */}
        {compatibilityCheck && compatibilityCheck.warnings.length > 0 && (
          <View style={[styles.warningCard, { backgroundColor: colors.warning + "20", borderColor: colors.warning }]}>
            <View style={styles.warningHeader}>
              <MaterialCommunityIcons name="alert" size={24} color={colors.warning} />
              <Text style={[styles.warningTitle, { color: colors.warning }]}>⚠️ Предупреждения</Text>
            </View>
            {compatibilityCheck.warnings.map((item, index) => (
              <Text key={index} style={[styles.warningText, { color: colors.warning }]}>
                • {item.message}
              </Text>
            ))}
          </View>
        )}

        {/* Правила приема */}
        {medicine.takeWithFood && !isPlaceholderText(medicine.takeWithFood) && renderSection(
          "Время приема относительно еды",
          "food",
          medicine.takeWithFood,
          colors.primary
        )}

        {medicine.takeWithLiquid && !isPlaceholderText(medicine.takeWithLiquid) && renderSection(
          "Чем запивать",
          "cup",
          medicine.takeWithLiquid,
          colors.primary
        )}

        {/* Взаимодействие с другими лекарствами - детальная информация */}
        {(() => {
          // Проверяем оба варианта: drugCompatibility и старые поля
          let drugCompatibility = null;
          
          if (medicine.drugCompatibility) {
            drugCompatibility = typeof medicine.drugCompatibility === 'string' 
              ? tryParseJSON(medicine.drugCompatibility) 
              : medicine.drugCompatibility;
          }
          
          // Если нет drugCompatibility, но есть старые поля, создаем объект
          if (!drugCompatibility) {
            // Проверяем, есть ли данные в старых полях (они уже должны быть распарсены в loadMedicine)
            let incompatibleList: any[] = [];
            let compatibleList: any[] = [];
            
            // Обрабатываем incompatibleMedicines
            if (medicine.incompatibleMedicines) {
              if (Array.isArray(medicine.incompatibleMedicines)) {
                incompatibleList = medicine.incompatibleMedicines.filter((item: any) => {
                  const itemStr = typeof item === 'string' ? item : (item?.name || item?.medicineName || String(item));
                  return itemStr && itemStr.trim() && !isPlaceholderText(itemStr);
                });
              } else if (typeof medicine.incompatibleMedicines === 'string') {
                try {
                  const parsed = JSON.parse(medicine.incompatibleMedicines);
                  if (Array.isArray(parsed)) {
                    incompatibleList = parsed.filter((item: any) => {
                      const itemStr = typeof item === 'string' ? item : (item?.name || item?.medicineName || String(item));
                      return itemStr && itemStr.trim() && !isPlaceholderText(itemStr);
                    });
                  }
                } catch (e) {
                  // Игнорируем ошибки парсинга
                }
              }
            }
            
            // Обрабатываем compatibleMedicines
            if (medicine.compatibleMedicines) {
              if (Array.isArray(medicine.compatibleMedicines)) {
                compatibleList = medicine.compatibleMedicines.filter((item: any) => {
                  const itemStr = typeof item === 'string' ? item : (item?.name || item?.medicineName || String(item));
                  return itemStr && itemStr.trim() && !isPlaceholderText(itemStr);
                });
              } else if (typeof medicine.compatibleMedicines === 'string') {
                try {
                  const parsed = JSON.parse(medicine.compatibleMedicines);
                  if (Array.isArray(parsed)) {
                    compatibleList = parsed.filter((item: any) => {
                      const itemStr = typeof item === 'string' ? item : (item?.name || item?.medicineName || String(item));
                      return itemStr && itemStr.trim() && !isPlaceholderText(itemStr);
                    });
                  }
                } catch (e) {
                  // Игнорируем ошибки парсинга
                }
              }
            }
            
            // Создаем drugCompatibility только если есть хотя бы какие-то данные
            if (incompatibleList.length > 0 || compatibleList.length > 0) {
              drugCompatibility = {
                incompatibleMedicines: incompatibleList,
                compatibleMedicines: compatibleList,
              };
            }
          }
          
          if (drugCompatibility && typeof drugCompatibility === 'object') {
            console.log("🔍 drugCompatibility объект:", {
              dangerousCombinations: drugCompatibility.dangerousCombinations,
              incompatibleMedicines: drugCompatibility.incompatibleMedicines,
              increasedToxicity: drugCompatibility.increasedToxicity,
              reducedEffect: drugCompatibility.reducedEffect,
              compatibleMedicines: drugCompatibility.compatibleMedicines,
            });
            
            const dangerousCombinations = Array.isArray(drugCompatibility.dangerousCombinations) 
              ? drugCompatibility.dangerousCombinations
                  .map((item: any) => typeof item === 'string' ? item : String(item))
                  .filter((item: string) => {
                    if (!item || !item.trim()) return false;
                    // Для взаимодействий с лекарствами не используем isPlaceholderText, так как это реальные данные
                    return true;
                  })
              : [];
            const reducedEffect = Array.isArray(drugCompatibility.reducedEffect) 
              ? drugCompatibility.reducedEffect
                  .map((item: any) => typeof item === 'string' ? item : String(item))
                  .filter((item: string) => {
                    if (!item || !item.trim()) return false;
                    return true;
                  })
              : [];
            const increasedToxicity = Array.isArray(drugCompatibility.increasedToxicity) 
              ? drugCompatibility.increasedToxicity
                  .map((item: any) => typeof item === 'string' ? item : String(item))
                  .filter((item: string) => {
                    if (!item || !item.trim()) return false;
                    return true;
                  })
              : [];
            
            // Обрабатываем incompatibleMedicines - может быть массивом или строкой
            let incompatibleMedicines: any[] = [];
            if (drugCompatibility.incompatibleMedicines) {
              if (Array.isArray(drugCompatibility.incompatibleMedicines)) {
                incompatibleMedicines = drugCompatibility.incompatibleMedicines
                  .map((item: any) => {
                    return typeof item === 'string' ? item : (item?.name || item?.medicineName || String(item));
                  })
                  .filter((item: string) => {
                    if (!item) return false;
                    const trimmed = String(item).trim();
                    return trimmed && trimmed.length > 0;
                  });
              } else if (typeof drugCompatibility.incompatibleMedicines === 'string') {
                try {
                  const parsed = JSON.parse(drugCompatibility.incompatibleMedicines);
                  if (Array.isArray(parsed)) {
                    incompatibleMedicines = parsed
                      .map((item: any) => typeof item === 'string' ? item : (item?.name || item?.medicineName || String(item)))
                      .filter((item: any) => {
                        const itemStr = String(item).trim();
                        return itemStr && itemStr.length > 0;
                      });
                  }
                } catch {
                  // Если не JSON, проверяем, может это просто строка с одним названием
                  const trimmed = drugCompatibility.incompatibleMedicines.trim();
                  if (trimmed) {
                    incompatibleMedicines = [trimmed];
                  }
                }
              }
            }
            
            // Обрабатываем compatibleMedicines - может быть массивом или строкой
            let compatibleMedicines: any[] = [];
            if (drugCompatibility.compatibleMedicines) {
              if (Array.isArray(drugCompatibility.compatibleMedicines)) {
                compatibleMedicines = drugCompatibility.compatibleMedicines
                  .map((item: any) => typeof item === 'string' ? item : (item?.name || item?.medicineName || String(item)))
                  .filter((item: any) => {
                    const itemStr = String(item).trim();
                    // Для взаимодействий с лекарствами НЕ используем isPlaceholderText, так как это реальные данные
                    return itemStr && itemStr.length > 0;
                  });
              } else if (typeof drugCompatibility.compatibleMedicines === 'string') {
                try {
                  const parsed = JSON.parse(drugCompatibility.compatibleMedicines);
                  if (Array.isArray(parsed)) {
                    compatibleMedicines = parsed
                      .map((item: any) => typeof item === 'string' ? item : (item?.name || item?.medicineName || String(item)))
                      .filter((item: any) => {
                        const itemStr = String(item).trim();
                        return itemStr && itemStr.length > 0;
                      });
                  }
                } catch {
                  // Если не JSON, проверяем, может это просто строка с одним названием
                  const trimmed = drugCompatibility.compatibleMedicines.trim();
                  if (trimmed) {
                    compatibleMedicines = [trimmed];
                  }
                }
              }
            }
            
            const hasAnyData = dangerousCombinations.length > 0 || 
                              reducedEffect.length > 0 || 
                              increasedToxicity.length > 0 || 
                              incompatibleMedicines.length > 0 || 
                              compatibleMedicines.length > 0;
            
            // Отображаем секцию, если есть хотя бы какие-то данные
            if (hasAnyData) {
              return (
                <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="pill" size={24} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      Взаимодействие с другими{'\n'}лекарствами
                    </Text>
                  </View>
                  
                  {dangerousCombinations.length > 0 && (
                    <View style={{ marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <Text style={[styles.sectionText, { color: colors.error, fontWeight: '700', marginBottom: 10, fontSize: 15 }]}>
                        🚨 Опасные комбинации
                      </Text>
                      {dangerousCombinations.map((item: any, index: number) => {
                        const itemText = typeof item === 'string' ? item : String(item);
                        return (
                          <View key={index} style={{ marginBottom: 6, paddingLeft: 8 }}>
                            <Text style={[styles.sectionText, { color: colors.error, fontSize: 14, lineHeight: 20 }]}>
                              • {itemText}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                  
                  {incompatibleMedicines.length > 0 && (
                    <View style={{ marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <Text style={[styles.sectionText, { color: colors.error, fontWeight: '700', marginBottom: 10, fontSize: 15 }]}>
                        ⛔ Несовместимые препараты
                      </Text>
                      {incompatibleMedicines.map((item: any, index: number) => {
                        const itemText = typeof item === 'string' ? item : String(item);
                        return (
                          <View key={index} style={{ marginBottom: 6, paddingLeft: 8 }}>
                            <Text style={[styles.sectionText, { color: colors.error, fontSize: 14, lineHeight: 20 }]}>
                              • {itemText}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                  
                  {increasedToxicity.length > 0 && (
                    <View style={{ marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <Text style={[styles.sectionText, { color: colors.warning, fontWeight: '700', marginBottom: 10, fontSize: 15 }]}>
                        ⚠️ Усиление токсичности
                      </Text>
                      {increasedToxicity.map((item: any, index: number) => {
                        const itemText = typeof item === 'string' ? item : String(item);
                        return (
                          <View key={index} style={{ marginBottom: 6, paddingLeft: 8 }}>
                            <Text style={[styles.sectionText, { color: colors.warning, fontSize: 14, lineHeight: 20 }]}>
                              • {itemText}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                  
                  {reducedEffect.length > 0 && (
                    <View style={{ marginBottom: 16, paddingBottom: 16, borderBottomWidth: compatibleMedicines.length > 0 ? 1 : 0, borderBottomColor: colors.border }}>
                      <Text style={[styles.sectionText, { color: colors.textSecondary, fontWeight: '700', marginBottom: 10, fontSize: 15 }]}>
                        📉 Снижение эффективности
                      </Text>
                      {reducedEffect.map((item: any, index: number) => {
                        const itemText = typeof item === 'string' ? item : String(item);
                        return (
                          <View key={index} style={{ marginBottom: 6, paddingLeft: 8 }}>
                            <Text style={[styles.sectionText, { color: colors.textSecondary, fontSize: 14, lineHeight: 20 }]}>
                              • {itemText}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                  
                  {compatibleMedicines.length > 0 && (
                    <View>
                      <Text style={[styles.sectionText, { color: colors.success, fontWeight: '700', marginBottom: 10, fontSize: 15 }]}>
                        ✅ Совместимые препараты
                      </Text>
                      {compatibleMedicines.map((item: any, index: number) => {
                        const itemText = typeof item === 'string' ? item : String(item);
                        return (
                          <View key={index} style={{ marginBottom: 6, paddingLeft: 8 }}>
                            <Text style={[styles.sectionText, { color: colors.success, fontSize: 14, lineHeight: 20 }]}>
                              • {itemText}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            }
          }
          
          // Если ничего не найдено, возвращаем null
          return null;
        })()}

        {/* Несовместимые препараты (старое поле, если нет детальной информации) */}
        {!medicine.drugCompatibility && !medicine.incompatibleMedicines && !medicine.compatibleMedicines && (() => {
          const incompatibleList = Array.isArray(medicine.incompatibleMedicines) 
            ? medicine.incompatibleMedicines 
            : (typeof medicine.incompatibleMedicines === 'string' 
                ? (medicine.incompatibleMedicines.trim() ? JSON.parse(medicine.incompatibleMedicines) : [])
                : []);
          
          if (incompatibleList && incompatibleList.length > 0) {
            const incompatibleNames = incompatibleList
              .map((item: any) => typeof item === 'string' ? item : item.medicineName || item)
              .filter((name: string) => name && !isPlaceholderText(name));
            
            if (incompatibleNames.length > 0) {
            return renderSection(
              "Несовместимые препараты",
              "alert-circle",
              incompatibleNames,
              colors.error
            );
            }
          }
          return null;
        })()}

        {/* Совместимые препараты */}
        {(() => {
          const compatibleList = Array.isArray(medicine.compatibleMedicines) 
            ? medicine.compatibleMedicines 
            : (typeof medicine.compatibleMedicines === 'string' 
                ? (medicine.compatibleMedicines.trim() ? JSON.parse(medicine.compatibleMedicines) : [])
                : []);
          
          if (compatibleList && compatibleList.length > 0) {
            return (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Совместимые препараты</Text>
                </View>
                {compatibleList.map((item: any, index: number) => (
                  <View key={index} style={styles.compatibleItem}>
                    <Text style={[styles.compatibleName, { color: colors.text }]}>
                      • {typeof item === 'string' ? item : (item.medicineName || item)}
                    </Text>
                    {item && typeof item === 'object' && item.instructions && (
                      <Text style={[styles.compatibleInstructions, { color: colors.textSecondary }]}>
                        {item.instructions}
                      </Text>
                    )}
                    {item && typeof item === 'object' && item.timeInterval && (
                      <Text style={[styles.compatibleTime, { color: colors.textSecondary }]}>
                        Интервал: {item.timeInterval}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            );
          }
          return null;
        })()}

        {/* Предупреждения о взаимодействиях с едой и аллергиях (не критичные) */}
        {foodInteractionsCheck && foodInteractionsCheck.severity !== "critical" && (foodInteractionsCheck.hasAllergies || foodInteractionsCheck.warnings.length > 0) && (
          <View style={[
            styles.warningCard, 
            { 
              backgroundColor: colors.warning + "20",
              borderColor: colors.warning
            }
          ]}>
            <View style={styles.warningHeader}>
              <MaterialCommunityIcons 
                name="food-off" 
                size={24} 
                color={colors.warning} 
              />
              <Text style={[
                styles.warningTitle, 
                { 
                  color: colors.warning 
                }
              ]}>
                ⚠️ Взаимодействия с едой и аллергии
              </Text>
            </View>

            {/* Аллергии на продукты */}
            {foodInteractionsCheck.matches.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.warningSubtitle, { color: colors.error }]}>
                  🚨 Аллергии на продукты:
                </Text>
                {foodInteractionsCheck.matches.map((match, index) => (
                  <Text key={index} style={[styles.warningText, { color: colors.error }]}>
                    • {match.food} - аллергия у {match.memberName} ({match.severity === "critical" ? "критическая" : "средняя"})
                  </Text>
                ))}
              </View>
            )}

            {/* Взаимодействия с лекарством */}
            {foodInteractionsCheck.warnings.length > 0 && (
              <View>
                <Text style={[styles.warningSubtitle, { color: colors.warning }]}>
                  ⚠️ Вредные комбинации с едой:
                </Text>
                {foodInteractionsCheck.warnings.map((warning, index) => (
                  <View key={index} style={{ marginBottom: 8 }}>
                    <Text style={[
                      styles.warningText, 
                      { 
                        color: warning.severity === "critical" ? colors.error : colors.warning,
                        fontWeight: warning.severity === "critical" ? "600" : "400"
                      }
                    ]}>
                      • {warning.food}: {warning.message}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Запрещенные продукты */}
        {(() => {
          if (!medicine.forbiddenFoods) return null;
          let forbiddenList: any[] = [];
          try {
            forbiddenList = Array.isArray(medicine.forbiddenFoods) 
              ? medicine.forbiddenFoods 
              : (typeof medicine.forbiddenFoods === 'string' 
                  ? (medicine.forbiddenFoods.trim() ? JSON.parse(medicine.forbiddenFoods) : [])
                  : []);
            // Убеждаемся, что это массив
            if (!Array.isArray(forbiddenList)) {
              forbiddenList = [];
            }
          } catch (error) {
            // Если парсинг не удался (например, строка "Информация не указана"), возвращаем пустой массив
            console.log('Ошибка парсинга forbiddenFoods:', error);
            forbiddenList = [];
          }
          const filtered = forbiddenList.filter((item: any) => {
            const itemStr = typeof item === 'string' ? item : String(item);
            return !isPlaceholderText(itemStr);
          });
          return filtered.length > 0 ? renderSection(
          "Запрещенные продукты",
          "food-off",
            filtered,
          colors.error
          ) : null;
        })()}

        {/* Рекомендуемые продукты */}
        {(() => {
          if (!medicine.recommendedFoods) return null;
          let recommendedList: any[] = [];
          try {
            recommendedList = Array.isArray(medicine.recommendedFoods) 
              ? medicine.recommendedFoods 
              : (typeof medicine.recommendedFoods === 'string' 
                  ? (medicine.recommendedFoods.trim() ? JSON.parse(medicine.recommendedFoods) : [])
                  : []);
            // Убеждаемся, что это массив
            if (!Array.isArray(recommendedList)) {
              recommendedList = [];
            }
          } catch (error) {
            // Если парсинг не удался (например, строка "Информация не указана"), возвращаем пустой массив
            console.log('Ошибка парсинга recommendedFoods:', error);
            recommendedList = [];
          }
          const filtered = recommendedList.filter((item: any) => {
            const itemStr = typeof item === 'string' ? item : String(item);
            return !isPlaceholderText(itemStr);
          });
          return filtered.length > 0 ? renderSection(
          "Рекомендуемые продукты",
          "food",
            filtered,
          colors.success
          ) : null;
        })()}

        {/* Взаимодействие с алкоголем */}
        {medicine.alcoholInteraction && !isPlaceholderText(medicine.alcoholInteraction) && renderSection(
          "Взаимодействие с алкоголем",
          "bottle-wine",
          medicine.alcoholInteraction,
          colors.warning
        )}

        {/* Взаимодействие с кофе/чаем */}
        {medicine.caffeineInteraction && !isPlaceholderText(medicine.caffeineInteraction) && renderSection(
          "Взаимодействие с кофе/чаем",
          "coffee",
          medicine.caffeineInteraction,
          colors.warning
        )}

        {/* Условия хранения */}
        {(() => {
          // Сначала проверяем storageConditionsDetailed (детальная информация)
          if (medicine.storageConditionsDetailed) {
            const storage = typeof medicine.storageConditionsDetailed === 'string' 
              ? tryParseJSON(medicine.storageConditionsDetailed) 
              : medicine.storageConditionsDetailed;
            
            if (storage && typeof storage === 'object') {
              const items: { label: string; value: string }[] = [];
              
              if (storage.temperature) items.push({ label: 'Температура', value: storage.temperature });
              if (storage.humidity) items.push({ label: 'Влажность', value: storage.humidity });
              if (storage.light) items.push({ label: 'Освещение', value: storage.light });
              if (storage.other) items.push({ label: 'Другое', value: storage.other });
              
              if (items.length > 0) {
                return (
                  <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.sectionHeader}>
                      <MaterialCommunityIcons name="thermometer" size={24} color={colors.primary} />
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>Условия хранения</Text>
                    </View>
                    {items.map((item, index) => (
                      <Text key={index} style={[styles.sectionText, { color: colors.textSecondary }]}>
                        • {item.label}: {item.value}
                      </Text>
                    ))}
                  </View>
                );
              }
            }
          }
          
          // Если нет детальной информации, показываем простую
          if (medicine.storageConditions && !isPlaceholderText(medicine.storageConditions)) {
            return renderSection(
          "Условия хранения",
          "thermometer",
          medicine.storageConditions,
          colors.primary
            );
          }
          
          return null;
        })()}

        {/* Особые указания */}
        {medicine.specialInstructions && !isPlaceholderText(medicine.specialInstructions) && renderSection(
          "Особые указания",
          "information",
          medicine.specialInstructions,
          colors.primary
        )}

        {/* Побочные эффекты */}
        {(() => {
          // Сначала проверяем sideEffectsDetailed (детальная информация)
          if (medicine.sideEffectsDetailed) {
            const sideEffects = typeof medicine.sideEffectsDetailed === 'string' 
              ? tryParseJSON(medicine.sideEffectsDetailed) 
              : medicine.sideEffectsDetailed;
            
            if (sideEffects && typeof sideEffects === 'object') {
              const categories: { label: string; value: any }[] = [];
              
              const processValue = (value: any): string | null => {
                if (!value) return null;
                if (Array.isArray(value)) {
                  return value.length > 0 ? value.join(', ') : null;
                }
                const valueStr = String(value).trim();
                if (!valueStr || isPlaceholderText(valueStr)) return null;
                return valueStr;
              };
              
              if (sideEffects.mild) {
                const mild = processValue(sideEffects.mild);
                if (mild) categories.push({ label: 'Легкие', value: mild });
              }
              if (sideEffects.moderate) {
                const moderate = processValue(sideEffects.moderate);
                if (moderate) categories.push({ label: 'Умеренные', value: moderate });
              }
              if (sideEffects.severe) {
                const severe = processValue(sideEffects.severe);
                if (severe) categories.push({ label: 'Тяжелые', value: severe });
              }
              if (sideEffects.frequency) {
                const frequency = processValue(sideEffects.frequency);
                if (frequency) categories.push({ label: 'Частота', value: frequency });
              }
              
              if (categories.length > 0) {
                return (
                  <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.sectionHeader}>
                      <MaterialCommunityIcons name="alert" size={24} color={colors.warning} />
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>Побочные эффекты</Text>
                    </View>
                    {categories.map((cat, index) => (
                      <Text key={index} style={[styles.sectionText, { color: colors.textSecondary }]}>
                        • {cat.label}: {cat.value}
                      </Text>
                    ))}
                  </View>
                );
              }
            }
          }
          
          // Если нет детальной информации, проверяем обычное поле sideEffects
          if (!medicine.sideEffects) return null;
          
          // Пропускаем плейсхолдеры
          if (isPlaceholderText(medicine.sideEffects)) return null;
          
          // Пытаемся распарсить как JSON
          const parsed = tryParseJSON(medicine.sideEffects);
          
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            // Если это объект с категориями (mild, moderate, severe, frequency)
            const categories: { label: string; value: any }[] = [];
            
            // Обрабатываем массивы и строки
            const processValue = (value: any): string | null => {
              if (!value) return null;
              if (Array.isArray(value)) {
                return value.length > 0 ? value.join(', ') : null;
              }
              const valueStr = String(value).trim();
              if (!valueStr || isPlaceholderText(valueStr)) return null;
              return valueStr;
            };
            
            const mild = processValue(parsed.mild);
            const moderate = processValue(parsed.moderate);
            const severe = processValue(parsed.severe);
            const frequency = processValue(parsed.frequency);
            
            if (mild) categories.push({ label: t('medicineDetails.mild'), value: mild });
            if (moderate) categories.push({ label: t('medicineDetails.moderate'), value: moderate });
            if (severe) categories.push({ label: t('medicineDetails.severe'), value: severe });
            if (frequency) categories.push({ label: t('medicineDetails.frequency'), value: frequency });
            
            if (categories.length > 0) {
              return (
                <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="alert" size={24} color={colors.warning} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('medicineDetails.sideEffects')}</Text>
                  </View>
                  {categories.map((cat, index) => (
                    <Text key={index} style={[styles.sectionText, { color: colors.textSecondary }]}>
                      • {cat.label}: {cat.value}
                    </Text>
                  ))}
                </View>
              );
            }
          } else if (!isPlaceholderText(medicine.sideEffects)) {
            // Обычный текст (не JSON)
            // Проверяем, не является ли это псевдо-JSON строкой
            if (medicine.sideEffects.includes('{') && medicine.sideEffects.includes('=')) {
              // Это псевдо-JSON, но не удалось распарсить - скрываем
              return null;
            }
            return renderSection(
              t('medicineDetails.sideEffects'),
          "alert",
          medicine.sideEffects,
          colors.warning
            );
          }
          
          return null;
        })()}

        {/* Противопоказания */}
        {medicine.contraindications && (() => {
          // Пропускаем плейсхолдеры
          if (isPlaceholderText(medicine.contraindications)) {
            return null;
          }
          
          // Пытаемся распарсить противопоказания как JSON (для противопоказаний по состояниям)
          let contraindicationsData: any = null;
          try {
            contraindicationsData = tryParseJSON(medicine.contraindications);
          } catch (e) {
            // Если не JSON, используем как строку
          }

          // Если это объект с противопоказаниями по состояниям
          if (contraindicationsData && typeof contraindicationsData === 'object' && !Array.isArray(contraindicationsData)) {
            const getConditionName = (key: string): string => {
              return t(`medicineDetails.${key}`) || key;
            };

            const conditions = Object.entries(contraindicationsData)
              .filter(([key, value]) => {
                // Пропускаем пустые массивы
                if (Array.isArray(value) && value.length === 0) return false;
                if (!value) return false;
                const valueStr = String(value).trim();
                // Пропускаем пустые строки и плейсхолдеры
                return valueStr !== '' && !isPlaceholderText(valueStr);
              })
              .map(([key, value]) => {
                // Обрабатываем массивы
                let description = '';
                if (Array.isArray(value)) {
                  description = value.length > 0 ? value.join(', ') : '';
                } else {
                  description = String(value).trim();
                }
                return {
                  condition: getConditionName(key) || key,
                  description: description,
                };
              })
              .filter(item => item.description && !isPlaceholderText(item.description));

            if (conditions.length > 0) {
              return (
                <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="cancel" size={24} color={colors.error} />
                    <Text style={[styles.sectionTitle, { color: colors.error }]}>{t('medicineDetails.contraindications')}</Text>
                  </View>
                  {conditions.map((item, index) => (
                    <View key={index} style={{ marginBottom: 8 }}>
                      <Text style={[styles.sectionText, { color: colors.error, fontWeight: '600' }]}>
                        • {item.condition}:
                      </Text>
                      <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
                        {item.description}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            }
          } else if (!isPlaceholderText(medicine.contraindications)) {
            // Если это обычная строка (и не плейсхолдер)
            // Проверяем, не является ли это псевдо-JSON строкой
            if (medicine.contraindications.includes('{') && medicine.contraindications.includes('=')) {
              // Это псевдо-JSON, но не удалось распарсить - скрываем
              return null;
            }
          return renderSection(
              t('medicineDetails.contraindications'),
            "cancel",
            medicine.contraindications,
            colors.error
          );
          }
          
          return null;
        })()}

        {/* Активные ингредиенты */}
        {medicine.activeIngredients && Array.isArray(medicine.activeIngredients) && medicine.activeIngredients.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="flask" size={24} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Активные ингредиенты</Text>
            </View>
            {medicine.activeIngredients.map((ing: any, index: number) => (
              <View key={index} style={{ marginBottom: 8 }}>
                <Text style={[styles.sectionText, { color: colors.text, fontWeight: '600' }]}>
                  • {typeof ing === 'string' ? ing : (ing.name || ing)}
                </Text>
                {ing && typeof ing === 'object' && ing.dose && (
                  <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
                    Дозировка: {ing.dose}
                  </Text>
                )}
                {ing && typeof ing === 'object' && ing.action && (
                  <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
                    {ing.action}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Международное название */}
        {medicine.internationalName && !isPlaceholderText(medicine.internationalName) && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              🌍 МНН: {medicine.internationalName}
            </Text>
          </View>
        )}

        {/* Производитель */}
        {medicine.manufacturer && !isPlaceholderText(medicine.manufacturer) && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              🏭 Производитель: {medicine.manufacturer}
            </Text>
          </View>
        )}

        {/* Категория */}
        {medicine.category && !isPlaceholderText(medicine.category) && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              📋 Категория: {medicine.category}
            </Text>
          </View>
        )}

        {/* Показания */}
        {medicine.indications && (() => {
          const indications = typeof medicine.indications === 'string' 
            ? tryParseJSON(medicine.indications) 
            : medicine.indications;
          
          if (indications && typeof indications === 'object') {
            const conditions = Array.isArray(indications.conditions) ? indications.conditions : [];
            const forAdults = indications.forAdults;
            const forChildren = indications.forChildren;
            
            if (conditions.length > 0 || forAdults || forChildren) {
              return (
                <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="medical-bag" size={24} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Показания к применению</Text>
                  </View>
                  {conditions.length > 0 && (
                    <View style={{ marginBottom: 12 }}>
                      {conditions.map((condition: string, index: number) => (
                        <Text key={index} style={[styles.sectionText, { color: colors.textSecondary }]}>
                          • {condition}
                        </Text>
                      ))}
                    </View>
                  )}
                  {forAdults && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={[styles.sectionText, { color: colors.text, fontWeight: '600' }]}>
                        Для взрослых:
                      </Text>
                      <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
                        {forAdults}
                      </Text>
                    </View>
                  )}
                  {forChildren && typeof forChildren === 'object' && (
                    <View>
                      <Text style={[styles.sectionText, { color: colors.text, fontWeight: '600' }]}>
                        Для детей:
                      </Text>
                      {forChildren.minAge && (
                        <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
                          Минимальный возраст: {forChildren.minAge}
                        </Text>
                      )}
                      {forChildren.dosage && (
                        <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
                          Дозировка: {forChildren.dosage}
                        </Text>
                      )}
                      {forChildren.description && (
                        <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
                          {forChildren.description}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            }
          }
          return null;
        })()}

        {/* Предупреждения */}
        {medicine.warnings && (() => {
          const warnings = typeof medicine.warnings === 'string' 
            ? tryParseJSON(medicine.warnings) 
            : medicine.warnings;
          
          if (warnings && typeof warnings === 'object') {
            const warningItems: { label: string; value: string }[] = [];
            
            if (warnings.alcohol) warningItems.push({ label: 'Алкоголь', value: warnings.alcohol });
            if (warnings.bleedingRisk) warningItems.push({ label: 'Риск кровотечения', value: warnings.bleedingRisk });
            if (warnings.allergicReactions) warningItems.push({ label: 'Аллергические реакции', value: warnings.allergicReactions });
            if (warnings.overdoseRisk) warningItems.push({ label: 'Риск передозировки', value: warnings.overdoseRisk });
            if (warnings.chronicDiseases) warningItems.push({ label: 'Хронические заболевания', value: warnings.chronicDiseases });
            
            if (warningItems.length > 0) {
              return (
                <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="alert-circle" size={24} color={colors.warning} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Предупреждения</Text>
                  </View>
                  {warningItems.map((item, index) => (
                    <View key={index} style={{ marginBottom: 8 }}>
                      <Text style={[styles.sectionText, { color: colors.warning, fontWeight: '600' }]}>
                        • {item.label}:
                      </Text>
                      <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
                        {item.value}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            }
          }
          return null;
        })()}

        {/* Информация для специальных групп */}
        {medicine.specialGroupsInfo && (() => {
          const groups = typeof medicine.specialGroupsInfo === 'string' 
            ? tryParseJSON(medicine.specialGroupsInfo) 
            : medicine.specialGroupsInfo;
          
          if (groups && typeof groups === 'object') {
            const sections: { title: string; content: any }[] = [];
            
            if (groups.pregnant) sections.push({ title: 'Беременные', content: groups.pregnant });
            if (groups.lactating) sections.push({ title: 'Кормящие', content: groups.lactating });
            if (groups.children) sections.push({ title: 'Дети', content: groups.children });
            if (groups.elderly) sections.push({ title: 'Пожилые', content: groups.elderly });
            if (groups.chronicDiseases) sections.push({ title: 'Хронические заболевания', content: groups.chronicDiseases });
            
            if (sections.length > 0) {
              return (
                <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="account-group" size={24} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Информация для специальных групп</Text>
                  </View>
                  {sections.map((section, index) => (
                    <View key={index} style={{ marginBottom: 16 }}>
                      <Text style={[styles.sectionText, { color: colors.text, fontWeight: '600', marginBottom: 8 }]}>
                        {section.title}:
                      </Text>
                      {section.content.allowed && (
                        <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
                          Разрешено: {section.content.allowed}
                        </Text>
                      )}
                      {section.content.warnings && (
                        <Text style={[styles.sectionText, { color: colors.warning, marginLeft: 16 }]}>
                          ⚠️ {section.content.warnings}
                        </Text>
                      )}
                      {section.content.risks && (
                        <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
                          Риски: {section.content.risks}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              );
            }
          }
          return null;
        })()}

        {/* Аналоги */}
        {medicine.analogs && Array.isArray(medicine.analogs) && medicine.analogs.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="swap-horizontal" size={24} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Аналоги и заменители</Text>
            </View>
            {medicine.analogs.map((analog: any, index: number) => (
              <View key={index} style={{ marginBottom: 12 }}>
                <Text style={[styles.sectionText, { color: colors.text, fontWeight: '600' }]}>
                  • {analog.name || analog}
                </Text>
                {analog && typeof analog === 'object' && (
                  <>
                    {analog.activeIngredient && (
                      <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
                        Действующее вещество: {analog.activeIngredient}
                      </Text>
                    )}
                    {analog.manufacturer && (
                      <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
                        Производитель: {analog.manufacturer}
                      </Text>
                    )}
                    {analog.similarity && (
                      <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
                        Схожесть: {analog.similarity}
                      </Text>
                    )}
                    {analog.differences && (
                      <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
                        Отличия: {analog.differences}
                      </Text>
                    )}
                  </>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Дополнительные рекомендации */}
        {medicine.additionalRecommendations && (() => {
          const recommendations = typeof medicine.additionalRecommendations === 'string' 
            ? tryParseJSON(medicine.additionalRecommendations) 
            : medicine.additionalRecommendations;
          
          if (recommendations && typeof recommendations === 'object') {
            const items: { label: string; value: string }[] = [];
            
            if (recommendations.driving !== undefined) items.push({ label: 'Вождение', value: recommendations.driving });
            if (recommendations.sports !== undefined) items.push({ label: 'Спорт', value: recommendations.sports });
            if (recommendations.heat !== undefined) items.push({ label: 'Жара', value: recommendations.heat });
            if (recommendations.vitamins !== undefined) items.push({ label: 'Витамины', value: recommendations.vitamins });
            if (recommendations.diabetes !== undefined) items.push({ label: 'Диабет', value: recommendations.diabetes });
            
            if (items.length > 0) {
              return (
                <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="information" size={24} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Дополнительные рекомендации</Text>
                  </View>
                  {items.map((item, index) => (
                    <Text key={index} style={[styles.sectionText, { color: colors.textSecondary }]}>
                      • {item.label}: {item.value}
                    </Text>
                  ))}
                </View>
              );
            }
          }
          return null;
        })()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
  },
  photo: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  medicineName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 8,
  },
  warningCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  warningSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  sectionText: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  compatibleItem: {
    marginBottom: 12,
  },
  compatibleName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  compatibleInstructions: {
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20,
  },
  compatibleTime: {
    fontSize: 12,
    fontStyle: "italic",
  },
});

