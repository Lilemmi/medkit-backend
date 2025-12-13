import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { callGeminiAPI } from "../../../../src/services/gemini-api.service";
import { useAuthStore } from "../../../../src/store/authStore";
import { createReminder } from "../../../../src/database/reminders.service";
import { createRefillNotification, findMedicineByName } from "../../../../src/database/refill.service";
import { useColors } from "../../../../src/theme/colors";
import { useLanguage } from "../../../../src/context/LanguageContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Modal from "../../../../src/components/Modal";
import LottieView from "lottie-react-native";
import { checkMedicineAllergies, AllergyCheckResult } from "../../../../src/services/allergy-check.service";
import AllergyWarning from "../../../../src/components/AllergyWarning";

// Загружаем анимацию загрузки
const loadingAnimation = require("../../../../assets/animations/Loading loop animation.json");

interface PrescriptionMedicine {
  name: string;
  dose: string;
  timesPerDay?: number; // Количество приемов в день
  times?: string[]; // Конкретное время приема (опционально)
  timeOfDay?: string[]; // Время суток: "утром", "днем", "вечером" (опционально)
}

interface PrescriptionData {
  medicines: PrescriptionMedicine[];
  doctorName?: string;
  date?: string;
}

export default function PrescriptionScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
  const { user } = useAuthStore();

  // Обработка системной кнопки "Назад" (Android)
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Возвращаемся на главный экран
        router.back();
        return true; // Предотвращаем стандартное поведение
      };

      // Добавляем обработчик
      const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress);

      // Удаляем обработчик при размонтировании
      return () => backHandler.remove();
    }, [router])
  );
  const colors = useColors();
  const { t, language } = useLanguage();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const [photo, setPhoto] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<PrescriptionData | null>(null);
  const [saved, setSaved] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showSleepTimeModal, setShowSleepTimeModal] = useState(false);
  const [wakeUpTime, setWakeUpTime] = useState("08:00");
  const [bedTime, setBedTime] = useState("22:00");
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [showInstruction, setShowInstruction] = useState(true);
  const [allergyResults, setAllergyResults] = useState<Map<string, AllergyCheckResult>>(new Map());
  const [showAllergyWarning, setShowAllergyWarning] = useState(false);
  const [currentAllergyCheck, setCurrentAllergyCheck] = useState<{ medicineName: string; result: AllergyCheckResult } | null>(null);

  // Анимация бегающей полоски по всему экрану
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  // Анимация для инструкции
  const instructionOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Анимация бегающей полоски по всему экрану
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnimation, { 
          toValue: 1, 
          duration: 2000, 
          useNativeDriver: true 
        }),
        Animated.timing(scanLineAnimation, { 
          toValue: 0, 
          duration: 0, 
          useNativeDriver: true 
        }),
      ])
    ).start();

    // Скрываем инструкцию через 5 секунд с плавной анимацией
    const timer = setTimeout(() => {
      Animated.timing(instructionOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setShowInstruction(false);
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Показываем всплывающее уведомление
  const showNotification = (message: string, type: "success" | "error" | "info" = "info") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  if (Platform.OS === "web") {
    return (
      <View style={styles.center}>
        <Text>{t("prescription.cameraNotAvailable")}</Text>
      </View>
    );
  }

  if (!permission) {
    return <View style={styles.center} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t("prescription.scannerTitle")}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <Text style={[styles.message, { color: colors.text }]}>{t("prescription.cameraPermission")}</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={styles.buttonText}>{t("prescription.requestPermission")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // -------------------------------------------------
  // 📸 СДЕЛАТЬ ФОТО
  // -------------------------------------------------
  async function takePicture() {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        // Отключаем звук на всех платформах
        mute: true,
      });
      setPhoto(photo);
      // analyzePrescription сам установит loading и обработает ошибки
      await analyzePrescription(photo.base64);
      showNotification(t("scan.analysisComplete") || "Анализ завершен", "success");
    } catch (e: any) {
      console.log("❌ Camera error:", e);
      setLoading(false);
      showNotification(t("prescription.cameraError") || "Ошибка камеры", "error");
      Alert.alert(
        t("common.error"),
        t("prescription.cameraError") || "Не удалось сделать снимок. Попробуйте еще раз.",
        [{ text: t("common.ok") }]
      );
    }
  }

  // -------------------------------------------------
  // 🤖 АНАЛИЗ РЕЦЕПТА (GEMINI)
  // -------------------------------------------------
  async function analyzePrescription(base64: string) {
    setLoading(true);
    setResult(null);
    setParsedData(null);

    // Получаем язык пользователя для промпта
    const currentLanguage = language;
    const promptText = currentLanguage === "ru" 
        ? `Проанализируй рецепт врача и верни СТРОГО JSON:

🚨 КРИТИЧЕСКИ ВАЖНО: В поле "name" указывай ТОЛЬКО ТОРГОВОЕ НАЗВАНИЕ ЛЕКАРСТВА (коммерческое название, бренд), БЕЗ действующего вещества!

📋 ПРАВИЛА РАСПОЗНАВАНИЯ НАЗВАНИЯ:
1. НИКОГДА не включай действующее вещество в название - это ОШИБКА!
2. Если в рецепте написано "Парацетамол 500мг" или "Ацетаминофен" - это действующее вещество, НЕ используй его
3. Если в рецепте написано "Панадол", "Эффералган", "Тайленол" - это торговые названия, используй их
4. Если в рецепте написано "Амоксициллин" - это действующее вещество, ищи торговое название (например, "Амоксиклав", "Флемоксин")
5. Если в рецепте указано только действующее вещество без торгового названия, попробуй найти наиболее распространенное торговое название для этого вещества

❌ ЧАСТЫЕ ОШИБКИ (НЕ ДЕЛАЙ ТАК):
- "Парацетамол" → НЕПРАВИЛЬНО (это действующее вещество)
- "Амоксициллин" → НЕПРАВИЛЬНО (это действующее вещество)
- "Ибупрофен" → НЕПРАВИЛЬНО (это действующее вещество)

✅ ПРАВИЛЬНЫЕ ПРИМЕРЫ:
- "Панадол" (НЕ "Парацетамол")
- "Эффералган" (НЕ "Парацетамол")
- "Амоксиклав" (НЕ "Амоксициллин")
- "Флемоксин" (НЕ "Амоксициллин")
- "Нурофен" (НЕ "Ибупрофен")

{
  "medicines": [
    {
      "name": "ТОЛЬКО ТОРГОВОЕ НАЗВАНИЕ (не действующее вещество!)",
      "dose": "дозировка (например, 500мг)",
      "timesPerDay": количество_приемов_в_день,
      "times": ["09:00", "21:00"], // опционально, конкретное время приема в формате ЧЧ:ММ
      "timeOfDay": ["утром", "днем", "вечером"] // опционально, время суток: "утром", "днем", "вечером"
    }
  ]
}
Если в рецепте указано время приема словами (утром, днем, вечером), используй timeOfDay.
Если указано конкретное время (например, 8:00, 13:00), используй times.
Если указано только количество раз в день без времени, используй timesPerDay.
Только JSON. Без Markdown. Без текста.`
        : currentLanguage === "en"
        ? `Analyze the doctor's prescription and return STRICTLY JSON:
IMPORTANT: In the "name" field, specify the BRAND NAME (commercial name) of the medicine, NOT the active ingredient!

Examples:
- If the prescription says "Paracetamol 500mg" or "Acetaminophen" - this is an active ingredient, DO NOT use it
- If the prescription says "Panadol", "Efferalgan", "Tylenol" - these are brand names, use them
- If the prescription says "Amoxicillin" - this is an active ingredient, look for the brand name (e.g., "Amoxiclav", "Flemoxin")
- If only the active ingredient is specified without a brand name, try to find the most common brand name for this substance

{
  "medicines": [
    {
      "name": "BRAND NAME OF MEDICINE (not active ingredient!)",
      "dose": "dosage (e.g., 500mg)",
      "timesPerDay": number_of_times_per_day,
      "times": ["09:00", "21:00"], // optional, specific times in HH:MM format
      "timeOfDay": ["morning", "afternoon", "evening"] // optional, time of day: "morning", "afternoon", "evening"
    }
  ]
}
If the prescription specifies time of day in words (morning, afternoon, evening), use timeOfDay.
If specific times are given (e.g., 8:00, 13:00), use times.
If only number of times per day is given without time, use timesPerDay.
Only JSON. No Markdown. No text.`
        : `נתח את המרשם הרפואי והחזר JSON בלבד:
חשוב: בשדה "name" ציין את שם המותג (השם המסחרי) של התרופה, ולא את החומר הפעיל!

דוגמאות:
- אם המרשם אומר "פרצטמול 500 מ"ג" - זה חומר פעיל, אל תשתמש בו
- אם המרשם אומר "אקמול", "דקסמול" - אלה שמות מותג, השתמש בהם
- אם המרשם אומר "אמוקסיצילין" - זה חומר פעיל, חפש את שם המותג (למשל "מוקסיפן", "אמוקסיל")
- אם מצוין רק חומר פעיל ללא שם מותג, נסה למצוא את שם המותג הנפוץ ביותר לחומר זה

{
  "medicines": [
    {
      "name": "שם המותג של התרופה (לא החומר הפעיל!)",
      "dose": "מינון (למשל, 500mg)",
      "timesPerDay": מספר_פעמים_ביום,
      "times": ["09:00", "21:00"], // אופציונלי, זמנים ספציפיים בפורמט HH:MM
      "timeOfDay": ["בוקר", "צהריים", "ערב"] // אופציונלי, זמן ביום: "בוקר", "צהריים", "ערב"
    }
  ]
}
אם במרשם מצוין זמן ביום במילים (בוקר, צהריים, ערב), השתמש ב-timeOfDay.
אם מצוינים זמנים ספציפיים (למשל, 8:00, 13:00), השתמש ב-times.
אם מצוין רק מספר פעמים ביום ללא זמן, השתמש ב-timesPerDay.
רק JSON. ללא Markdown. ללא טקסט.`;

    try {
      const result = await callGeminiAPI({
        prompt: promptText,
        imageBase64: base64,
        mimeType: "image/jpeg",
      });

      // Проверяем наличие ошибки
      if (result.error) {
        if (result.error.code === 429 || result.error.status === "RESOURCE_EXHAUSTED") {
          const retryAfter = result.error.message?.match(/retry in ([\d.]+)s/i)?.[1];
          const waitTime = retryAfter ? Math.ceil(parseFloat(retryAfter)) : 15;
          
          setResult(t("prescription.quotaExceeded"));
          Alert.alert(
            t("prescription.quotaExceededTitle"),
            t("prescription.quotaExceededMessage"),
            [{ text: t("common.ok"), style: "default" }]
          );
          setLoading(false);
          return;
        } else if (result.error.code === 503 || result.error.status === "UNAVAILABLE") {
          setResult("Сервис временно перегружен. Пожалуйста, попробуйте через несколько секунд.");
          Alert.alert(
            t("common.error"),
            "Сервис временно перегружен. Пожалуйста, попробуйте через несколько секунд.",
            [{ text: t("common.ok"), style: "default" }]
          );
          setLoading(false);
          return;
        } else {
          throw new Error(result.error.message || t("prescription.analysisError"));
        }
      }

      const raw = result.text;
      setResult(raw);

      // Очищаем JSON
      let cleaned = raw
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) {
        console.log("❌ JSON NOT FOUND");
        setResult(t("prescription.jsonNotFound"));
        return;
      }

      cleaned = match[0];

      let parsed: PrescriptionData;
      try {
        parsed = JSON.parse(cleaned);
      } catch (e) {
        console.log("❌ JSON parse error:", e);
        setResult(t("prescription.parseError"));
        setParsedData(null);
        return;
      }

      // Очищаем названия лекарств от действующих веществ
      if (parsed.medicines && Array.isArray(parsed.medicines)) {
        const activeIngredients = [
          // Анальгетики и жаропонижающие
          "Парацетамол", "Paracetamol", "Ацетаминофен", "Acetaminophen",
          "Ибупрофен", "Ibuprofen",
          "Ацетилсалициловая кислота", "Acetylsalicylic acid", "Аспирин", "Aspirin",
          "Диклофенак", "Diclofenac",
          "Кеторолак", "Ketorolac",
          "Нимесулид", "Nimesulide",
          
          // Антибиотики
          "Амоксициллин", "Amoxicillin",
          "Азитромицин", "Azithromycin",
          "Цефтриаксон", "Ceftriaxone",
          "Цефуроксим", "Cefuroxime",
          "Кларитромицин", "Clarithromycin",
          "Доксициклин", "Doxycycline",
          
          // Антидепрессанты
          "Эсциталопрам", "Escitalopram",
          "Сертралин", "Sertraline",
          "Флуоксетин", "Fluoxetine",
          "Пароксетин", "Paroxetine",
          "Венлафаксин", "Venlafaxine",
          
          // Противовирусные
          "Ацикловир", "Acyclovir",
          "Осельтамивир", "Oseltamivir",
          
          // Другие распространенные
          "Лоратадин", "Loratadine",
          "Цетиризин", "Cetirizine",
          "Омепразол", "Omeprazole",
          "Пантопразол", "Pantoprazole",
          "Метформин", "Metformin",
          "Амлодипин", "Amlodipine",
          "Лозартан", "Losartan",
        ];

        for (const medicine of parsed.medicines) {
          if (medicine.name) {
            let cleanedName = medicine.name.trim();
            
            // Проверяем, не является ли само название действующим веществом
            const isActiveIngredient = activeIngredients.some(ingredient => 
              cleanedName.toLowerCase() === ingredient.toLowerCase() ||
              cleanedName.toLowerCase().startsWith(ingredient.toLowerCase() + " ")
            );
            
            if (isActiveIngredient) {
              console.warn("⚠️ Распознано действующее вещество вместо торгового названия:", cleanedName);
            } else {
              // Если название содержит скобки, берем содержимое скобок (торговое название)
              const bracketMatch = cleanedName.match(/\(([^)]+)\)/);
              if (bracketMatch && bracketMatch[1]) {
                cleanedName = bracketMatch[1].trim();
              } else {
                // Удаляем действующее вещество из начала названия
                for (const ingredient of activeIngredients) {
                  const pattern = new RegExp(`^${ingredient}\\s+`, "i");
                  if (pattern.test(cleanedName)) {
                    cleanedName = cleanedName.replace(pattern, "").trim();
                    break;
                  }
                }
              }
              
              if (cleanedName && cleanedName.length > 0) {
                medicine.name = cleanedName;
              }
            }
          }
        }
      }

      setParsedData(parsed);
      setResult(t("prescription.analysisComplete"));
      console.log("✅ Данные распарсены:", parsed);
    } catch (e: any) {
      console.log("❌ Ошибка Gemini:", e);
      
      // Проверяем тип ошибки для более понятного сообщения
      let errorMessage = t("prescription.analysisError");
      
      if (e?.error?.code === 429 || e?.error?.status === "RESOURCE_EXHAUSTED") {
        errorMessage = t("prescription.quotaExceeded") || "Вы превысили лимит запросов на день попробуйте снова завтра";
      } else if (e?.error?.code === 503 || e?.error?.status === "UNAVAILABLE") {
        errorMessage = "Сервис временно перегружен. Пожалуйста, попробуйте через несколько секунд.";
      } else if (e?.message) {
        errorMessage = e.message;
      }
      
      setResult(errorMessage);
      Alert.alert(
        t("common.error"),
        errorMessage,
        [{ text: t("common.ok"), style: "default" }]
      );
      setParsedData(null);
    } finally {
      setLoading(false);
    }
  }

  // -------------------------------------------------
  // 💾 СОЗДАТЬ НАПОМИНАНИЯ ИЗ РЕЦЕПТА
  // -------------------------------------------------
  async function handleCreateReminders() {
    if (!parsedData || !user?.id) {
      Alert.alert(t("common.error"), t("prescription.noData"));
      return;
    }

    // Показываем модальное окно для ввода времени пробуждения и отхода ко сну
    setShowSleepTimeModal(true);
  }

  async function createRemindersWithSleepTime() {
    if (!parsedData || !user?.id) {
      return;
    }

    // Валидация времени
    const wakeTimeMatch = wakeUpTime.match(/^(\d{1,2}):(\d{2})$/);
    const bedTimeMatch = bedTime.match(/^(\d{1,2}):(\d{2})$/);
    
    if (!wakeTimeMatch || !bedTimeMatch) {
      Alert.alert(t("common.error"), t("prescription.timeFormatError"));
      return;
    }

    const wakeHour = parseInt(wakeTimeMatch[1]);
    const wakeMinute = parseInt(wakeTimeMatch[2]);
    const bedHour = parseInt(bedTimeMatch[1]);
    const bedMinute = parseInt(bedTimeMatch[2]);

    if (wakeHour < 0 || wakeHour > 23 || wakeMinute < 0 || wakeMinute > 59 ||
        bedHour < 0 || bedHour > 23 || bedMinute < 0 || bedMinute > 59) {
      Alert.alert(t("common.error"), t("prescription.invalidTime"));
      return;
    }

    setShowSleepTimeModal(false);
    setProcessing(true);

    try {
      let createdCount = 0;
      const missingMedicines: string[] = [];

      for (const medicine of parsedData.medicines) {
        // Проверяем аллергии перед созданием напоминаний
        const allergyCheck = await checkMedicineAllergies(
          medicine.name,
          user.id,
          user.allergies || undefined,
          user.name || undefined
        );

        // Если есть аллергии, показываем предупреждение
        if (allergyCheck.hasAllergies) {
          setCurrentAllergyCheck({ medicineName: medicine.name, result: allergyCheck });
          setShowAllergyWarning(true);
          setProcessing(false);
          return; // Прерываем создание напоминаний
        }

        // Проверяем, есть ли лекарство в аптечке
        const existingMedicine = await findMedicineByName(user.id, medicine.name);

        if (!existingMedicine) {
          // Лекарства нет в аптечке - создаем уведомление о необходимости покупки
          missingMedicines.push(medicine.name);
          await createRefillNotification({
            medicineName: medicine.name,
            dose: medicine.dose,
            reason: `Лекарство необходимо для приема по рецепту. Дозировка: ${medicine.dose}`,
            reasonType: "missing",
            userId: user.id,
          });
        }

        // Создаем напоминания (без добавления в аптечку)
        const medicineId = existingMedicine?.id || null;
        
        // Функция для преобразования времени суток в конкретное время с учетом времени пробуждения и отхода ко сну
        const getTimeFromTimeOfDay = (timeOfDay: string): { hour: number; minute: number } => {
          const normalized = timeOfDay.toLowerCase().trim();
          
          // Парсим время пробуждения и отхода ко сну
          const wakeTimeMatch = wakeUpTime.match(/^(\d{1,2}):(\d{2})$/);
          const bedTimeMatch = bedTime.match(/^(\d{1,2}):(\d{2})$/);
          
          if (wakeTimeMatch && bedTimeMatch) {
            const wakeHour = parseInt(wakeTimeMatch[1]);
            const wakeMinute = parseInt(wakeTimeMatch[2]);
            const bedHour = parseInt(bedTimeMatch[1]);
            const bedMinute = parseInt(bedTimeMatch[2]);
            
            const wakeMinutes = wakeHour * 60 + wakeMinute;
            const bedMinutes = bedHour * 60 + bedMinute;
            let timeRange = bedMinutes - wakeMinutes;
            if (timeRange <= 0) {
              timeRange = (24 * 60 - wakeMinutes) + bedMinutes;
            }
            
            if (normalized.includes("утром") || normalized.includes("morning") || normalized.includes("בוקר")) {
              // Утром - через 1-2 часа после пробуждения
              const morningMinutes = wakeMinutes + 60; // Через час после пробуждения
              const totalMinutes = morningMinutes % (24 * 60);
              return { hour: Math.floor(totalMinutes / 60), minute: totalMinutes % 60 };
            } else if (normalized.includes("днем") || normalized.includes("afternoon") || normalized.includes("צהריים")) {
              // Днем - примерно в середине промежутка
              const middayMinutes = wakeMinutes + Math.floor(timeRange / 2);
              const totalMinutes = middayMinutes % (24 * 60);
              return { hour: Math.floor(totalMinutes / 60), minute: totalMinutes % 60 };
            } else if (normalized.includes("вечером") || normalized.includes("evening") || normalized.includes("ערב")) {
              // Вечером - за 2-3 часа до отхода ко сну
              const eveningMinutes = bedMinutes - 120; // За 2 часа до сна
              const totalMinutes = eveningMinutes >= 0 ? eveningMinutes : (24 * 60 + eveningMinutes);
              return { hour: Math.floor(totalMinutes / 60), minute: totalMinutes % 60 };
            }
          }
          
          // Fallback на стандартные времена, если не удалось распарсить
          if (normalized.includes("утром") || normalized.includes("morning") || normalized.includes("בוקר")) {
            return { hour: 8, minute: 0 };
          } else if (normalized.includes("днем") || normalized.includes("afternoon") || normalized.includes("צהריים")) {
            return { hour: 13, minute: 0 };
          } else if (normalized.includes("вечером") || normalized.includes("evening") || normalized.includes("ערב")) {
            return { hour: 19, minute: 0 };
          }
          
          // По умолчанию утро
          return { hour: 8, minute: 0 };
        };

        if (medicine.times && medicine.times.length > 0) {
          // Если указано конкретное время, проверяем что оно в пределах времени бодрствования
          for (const timeStr of medicine.times) {
            const [hour, minute] = timeStr.split(":").map(Number);
            
            // Парсим время пробуждения и отхода ко сну для проверки
            const wakeTimeMatch = wakeUpTime.match(/^(\d{1,2}):(\d{2})$/);
            const bedTimeMatch = bedTime.match(/^(\d{1,2}):(\d{2})$/);
            
            let shouldCreate = true;
            if (wakeTimeMatch && bedTimeMatch) {
              const wakeHour = parseInt(wakeTimeMatch[1]);
              const wakeMinute = parseInt(wakeTimeMatch[2]);
              const bedHour = parseInt(bedTimeMatch[1]);
              const bedMinute = parseInt(bedTimeMatch[2]);
              
              const timeMinutes = hour * 60 + minute;
              const wakeMinutes = wakeHour * 60 + wakeMinute;
              const bedMinutes = bedHour * 60 + bedMinute;
              
              // Проверяем, что время в пределах времени бодрствования
              if (bedMinutes > wakeMinutes) {
                // Нормальный случай: отход ко сну позже пробуждения
                shouldCreate = timeMinutes >= wakeMinutes && timeMinutes <= bedMinutes;
              } else {
                // Отход ко сну раньше пробуждения (переход через полночь)
                shouldCreate = timeMinutes >= wakeMinutes || timeMinutes <= bedMinutes;
              }
            } else {
              // Если не удалось распарсить, используем стандартную проверку
              shouldCreate = hour >= 6 && hour < 24;
            }
            
            if (shouldCreate) {
              await createReminder({
                medicineId,
                medicineName: medicine.name,
                title: `${t("prescription.takeMedicine")}: ${medicine.name}`,
                body: `${medicine.dose} - ${t("prescription.time")} ${timeStr}`,
                hour,
                minute: minute || 0,
                daysOfWeek: undefined, // Ежедневно
                userId: user.id,
              });
              createdCount++;
            }
          }
        } else if (medicine.timeOfDay && medicine.timeOfDay.length > 0) {
          // Если указано время суток (утром, днем, вечером)
          for (const timeOfDay of medicine.timeOfDay) {
            const { hour, minute } = getTimeFromTimeOfDay(timeOfDay);
            const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
            
            await createReminder({
              medicineId,
              medicineName: medicine.name,
              title: `${t("prescription.takeMedicine")}: ${medicine.name}`,
              body: `${medicine.dose} - ${t("prescription.time")} ${timeStr}`,
              hour,
              minute,
              daysOfWeek: undefined, // Ежедневно
              userId: user.id,
            });
            createdCount++;
          }
        } else {
          // Если указано только количество раз в день, распределяем равномерно в промежутке от пробуждения до отхода ко сну
          const timesPerDay = medicine.timesPerDay || 1;
          
          // Парсим время пробуждения и отхода ко сну
          const [wakeHour, wakeMinute] = wakeUpTime.split(":").map(Number);
          const [bedHour, bedMinute] = bedTime.split(":").map(Number);
          
          // Преобразуем в минуты для удобства расчетов
          const wakeMinutes = wakeHour * 60 + wakeMinute;
          const bedMinutes = bedHour * 60 + bedMinute;
          
          // Вычисляем промежуток времени в минутах
          let timeRange = bedMinutes - wakeMinutes;
          if (timeRange < 0) {
            // Если время отхода ко сну раньше пробуждения (например, 22:00 - 08:00 следующего дня)
            timeRange = (24 * 60 - wakeMinutes) + bedMinutes;
          }
          
          // Распределяем приемы равномерно в этом промежутке
          const interval = timeRange / (timesPerDay + 1); // +1 чтобы первый прием был не сразу после пробуждения
          
          for (let i = 0; i < timesPerDay; i++) {
            // Вычисляем время приема
            const minutesFromWake = Math.round(wakeMinutes + interval * (i + 1));
            const totalMinutes = minutesFromWake % (24 * 60); // Обрабатываем переход через полночь
            const hour = Math.floor(totalMinutes / 60);
            const minute = totalMinutes % 60;
            
            const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
            
            await createReminder({
              medicineId,
              medicineName: medicine.name,
              title: `${t("prescription.takeMedicine")}: ${medicine.name}`,
              body: `${medicine.dose} - ${t("prescription.time")} ${timeStr}`,
              hour,
              minute,
              daysOfWeek: undefined, // Ежедневно
              userId: user.id,
            });
            createdCount++;
          }
        }
      }

      setSaved(true);
      
      let message = t("prescription.remindersCreated", { count: createdCount });
      if (missingMedicines.length > 0) {
        message += `\n\n⚠️ ${missingMedicines.length} ${missingMedicines.length === 1 ? "лекарство отсутствует" : "лекарств отсутствуют"} в аптечке. Проверьте вкладку "Пополнение лекарств".`;
      }
      
      Alert.alert(
        t("common.success"),
        message,
        [
          {
            text: t("common.ok"),
            onPress: () => router.back(),
          },
        ]
      );
    } catch (e) {
      console.log("❌ Ошибка создания напоминаний:", e);
      Alert.alert(t("common.error"), t("prescription.createError"));
    } finally {
      setProcessing(false);
    }
  }

  // Вычисляем высоту экрана для анимации полоски
  const screenHeight = 1000;
  const scanLineTranslateY = scanLineAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, screenHeight],
  });

  // -------------------------------------------------
  // 📱 ЭКРАН РЕЗУЛЬТАТА
  // -------------------------------------------------
  // Если идет загрузка и нет данных, показываем полноэкранный экран загрузки
  if (loading && !parsedData && !showSleepTimeModal) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingContainer}>
          <LottieView
            source={loadingAnimation}
            style={styles.loadingAnimation}
            autoPlay
            loop
            resizeMode="contain"
          />
          <Text style={styles.loadingText}>
            {t("scan.analyzing") || "Анализ рецепта..."}
          </Text>
        </View>
      </View>
    );
  }

  if (photo && parsedData) {
    return (
      <ScrollView
        style={[styles.resultContainer, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.resultContent}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t("prescription.scannerTitle")}</Text>
          <View style={{ width: 24 }} />
        </View>

        <Image source={{ uri: photo.uri }} style={styles.resultImage} />

        <View style={[styles.dataContainer, { backgroundColor: colors.surface }]}>
          {parsedData.medicines.map((med, index) => (
            <View key={index} style={[styles.medicineCard, { borderColor: colors.border }]}>
              <Text style={[styles.medicineName, { color: colors.text }]}>{med.name}</Text>
              <Text style={[styles.medicineDose, { color: colors.textSecondary }]}>
                {t("prescription.dose")}: {med.dose}
              </Text>
              {med.times && med.times.length > 0 && (
                <Text style={[styles.medicineTimes, { color: colors.textSecondary }]}>
                  {t("prescription.times")}: {med.times.join(", ")}
                </Text>
              )}
              {med.timeOfDay && med.timeOfDay.length > 0 && (
                <Text style={[styles.medicineTimes, { color: colors.textSecondary }]}>
                  {t("prescription.times")}: {med.timeOfDay.join(", ")}
                </Text>
              )}
              {med.timesPerDay && !med.times && !med.timeOfDay && (
                <Text style={[styles.medicineTimes, { color: colors.textSecondary }]}>
                  {t("prescription.timesPerDay")}: {med.timesPerDay}
                </Text>
              )}
            </View>
          ))}
        </View>

        {parsedData && !saved && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={handleCreateReminders}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.addButtonText}>{t("prescription.createReminders")}</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.scanButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            setPhoto(null);
            setParsedData(null);
            setResult(null);
            setSaved(false);
          }}
        >
          <Text style={[styles.scanButtonText, { color: colors.primary }]}>
            {t("prescription.scanAgain")}
          </Text>
        </TouchableOpacity>

        {/* Модальное окно для ввода времени пробуждения и отхода ко сну */}
        <Modal
          visible={showSleepTimeModal}
          onClose={() => setShowSleepTimeModal(false)}
          title={t("prescription.sleepTimeTitle")}
          subtitle={t("prescription.sleepTimeSubtitle")}
          buttons={[
            {
              text: t("common.cancel"),
              onPress: () => setShowSleepTimeModal(false),
              style: "cancel",
            },
            {
              text: t("prescription.confirm"),
              onPress: createRemindersWithSleepTime,
              disabled: processing,
              loading: processing,
              style: "primary",
            },
          ]}
        >
          <View style={styles.timeInputContainer}>
            <View style={styles.timeInputGroup}>
              <MaterialCommunityIcons name="weather-sunny" size={24} color={colors.primary} />
              <View style={styles.timeInputWrapper}>
                <Text style={[styles.timeLabel, { color: colors.text }]}>{t("prescription.wakeUpTime")}</Text>
                <TextInput
                  style={[styles.timeInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  placeholder="08:00"
                  placeholderTextColor={colors.textSecondary}
                  value={wakeUpTime}
                  onChangeText={(text) => {
                    // Форматируем ввод как ЧЧ:ММ
                    const cleaned = text.replace(/[^\d]/g, "");
                    if (cleaned.length <= 2) {
                      setWakeUpTime(cleaned);
                    } else if (cleaned.length <= 4) {
                      setWakeUpTime(`${cleaned.slice(0, 2)}:${cleaned.slice(2)}`);
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
            </View>

            <View style={styles.timeInputGroup}>
              <MaterialCommunityIcons name="weather-night" size={24} color={colors.primary} />
              <View style={styles.timeInputWrapper}>
                <Text style={[styles.timeLabel, { color: colors.text }]}>{t("prescription.bedTime")}</Text>
                <TextInput
                  style={[styles.timeInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  placeholder="22:00"
                  placeholderTextColor={colors.textSecondary}
                  value={bedTime}
                  onChangeText={(text) => {
                    // Форматируем ввод как ЧЧ:ММ
                    const cleaned = text.replace(/[^\d]/g, "");
                    if (cleaned.length <= 2) {
                      setBedTime(cleaned);
                    } else if (cleaned.length <= 4) {
                      setBedTime(`${cleaned.slice(0, 2)}:${cleaned.slice(2)}`);
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Модальное окно предупреждения об аллергиях */}
        <AllergyWarning
          visible={showAllergyWarning}
          result={currentAllergyCheck?.result || null}
          medicineName={currentAllergyCheck?.medicineName || ""}
          onClose={async () => {
            setShowAllergyWarning(false);
            // Если пользователь закрыл предупреждение, продолжаем создание напоминаний
            // (пользователь подтвердил, что хочет продолжить)
            if (currentAllergyCheck) {
              await createRemindersWithSleepTime();
            }
            setCurrentAllergyCheck(null);
          }}
        />
      </ScrollView>
    );
  }

  // -------------------------------------------------
  // 📷 ЭКРАН КАМЕРЫ
  // -------------------------------------------------
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t("prescription.scannerTitle")}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          flash={flashEnabled ? "on" : "off"}
        />
        
        {/* Бегающая полоска по всему экрану */}
        <Animated.View 
          style={[
            styles.scanLineFull, 
            { 
              transform: [{ translateY: scanLineTranslateY }],
              opacity: scanLineAnimation.interpolate({
                inputRange: [0, 0.3, 0.5, 0.7, 1],
                outputRange: [0.2, 0.8, 1, 0.8, 0.2],
              }),
            }
          ]} 
        />

        {/* Всплывающее уведомление */}
        {notification && (
          <Animated.View 
            style={[
              styles.notification,
              {
                backgroundColor: notification.type === "success" ? "#34C759" : 
                                 notification.type === "error" ? "#FF3B30" : "#007AFF",
              }
            ]}
          >
            <Text style={styles.notificationText}>{notification.message}</Text>
          </Animated.View>
        )}

        {/* Кнопка переключения вспышки */}
        <TouchableOpacity
          style={[styles.flashButton, { top: insets.top + 10 }]}
          onPress={() => setFlashEnabled(!flashEnabled)}
        >
          <MaterialCommunityIcons 
            name={flashEnabled ? "flashlight" : "flashlight-off"} 
            size={28} 
            color={flashEnabled ? "#FFD700" : "#FFFFFF"} 
          />
        </TouchableOpacity>

        {/* Кнопка закрытия */}
        <TouchableOpacity
          style={[styles.closeButton, { top: insets.top + 10 }]}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Инструкция - исчезает через 5 секунд */}
        {showInstruction && (
          <Animated.View 
            style={[
              styles.instructionContainer,
              {
                opacity: instructionOpacity,
              }
            ]}
          >
            <Text style={styles.instructionText}>
              {t("prescription.instruction")}
            </Text>
          </Animated.View>
        )}

        {/* Нижние элементы управления */}
        <View style={styles.bottomControls}>
          {/* Красивая кнопка съемки */}
          <TouchableOpacity
            style={styles.captureButton}
            onPress={takePicture}
            disabled={loading}
          >
            <View style={styles.captureButtonOuter}>
              <View style={styles.captureButtonInner}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.captureButtonDot} />
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  cameraContainer: {
    flex: 1,
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  // Бегающая полоска по всему экрану
  scanLineFull: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#00FF88",
    shadowColor: "#00FF88",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 10,
  },
  // Кнопка закрытия
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  // Кнопка вспышки
  flashButton: {
    position: "absolute",
    top: 50,
    left: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  // Инструкция
  instructionContainer: {
    position: "absolute",
    top: 120,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 40,
    zIndex: 50,
  },
  instructionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  // Всплывающее уведомление
  notification: {
    position: "absolute",
    top: 100,
    left: 20,
    right: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    zIndex: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  notificationText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  // Нижние элементы управления
  bottomControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    paddingBottom: 50,
    zIndex: 100,
  },
  // Красивая кнопка съемки
  captureButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 5,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  captureButtonOuter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#007AFF",
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  resultContainer: {
    flex: 1,
  },
  resultContent: {
    padding: 20,
    paddingBottom: 40,
  },
  resultImage: {
    width: "100%",
    height: 300,
    borderRadius: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  dataContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  medicineCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  medicineDose: {
    fontSize: 14,
    marginBottom: 4,
  },
  medicineTimes: {
    fontSize: 14,
  },
  resultText: {
    fontSize: 16,
    textAlign: "center",
    marginVertical: 20,
  },
  addButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  scanButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  timeInputContainer: {
    gap: 16,
    marginBottom: 24,
  },
  timeInputGroup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    width: "100%",
  },
  timeInputWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
    width: "100%",
  },
  timeInput: {
    fontSize: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: "center",
    fontFamily: "monospace",
    width: "100%",
    minWidth: 100,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingAnimation: {
    width: 200,
    height: 200,
  },
  loadingText: {
    marginTop: 24,
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
});

