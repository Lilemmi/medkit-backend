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
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { callGeminiAPI } from "../../../../src/services/gemini-api.service";
import { saveMedicine , getAllMedicines } from "../../../../src/database/medicine.service";
import { useAuthStore } from "../../../../src/store/authStore";
import { 
  checkMedicineCompatibility,
  checkDangerousInteractions,
  checkContraindications
} from "../../../../src/services/medicine-compatibility.service";
import { getAllFamilyMembers } from "../../../../src/services/family.service";
import { checkMedicineAllergies, AllergyCheckResult } from "../../../../src/services/allergy-check.service";
import AllergyWarning from "../../../../src/components/AllergyWarning";
import { useLanguage } from "../../../../src/context/LanguageContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useColors } from "../../../../src/theme/colors";
import Modal, { ModalInput } from "../../../../src/components/Modal";
import ExpiryDatePicker from "../../../../src/components/ExpiryDatePicker";
import LottieView from "lottie-react-native";

// Загружаем анимацию загрузки
const loadingAnimation = require("../../../../assets/animations/Loading loop animation.json");

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const colors = useColors();
  const { language, t } = useLanguage();
  const [permission, requestPermission] = useCameraPermissions();

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
  const cameraRef = useRef<any>(null);

  const [photo, setPhoto] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [showInstruction, setShowInstruction] = useState(true);
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [allergyResult, setAllergyResult] = useState<AllergyCheckResult | null>(null);
  const [showAllergyWarning, setShowAllergyWarning] = useState(false);

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

    // Загружаем список членов семьи
    loadFamilyMembers();

    return () => clearTimeout(timer);
  }, []);

  // Загружаем список членов семьи
  async function loadFamilyMembers() {
    try {
      const members = await getAllFamilyMembers();
      // Добавляем текущего пользователя в начало списка
      const allMembers = [];
      if (user) {
        allMembers.push({
          id: `user-${user.id}`,
          name: user.name || user.email || "Я",
          role: "user",
        });
      }
      allMembers.push(...members);
      setFamilyMembers(allMembers);
      // Устанавливаем пользователя по умолчанию
      if (user && !selectedFamilyMemberId) {
        setSelectedFamilyMemberId(`user-${user.id}`);
      }
    } catch (error) {
      console.error("Ошибка загрузки членов семьи:", error);
    }
  }

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
        <Text>Камера недоступна в WEB</Text>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text>Запрашиваем разрешение…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>Нет доступа к камере</Text>
        <TouchableOpacity onPress={requestPermission}>
          <Text style={{ marginTop: 12, color: "blue" }}>Разрешить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // -------------------------------------------------
  // 📸 ФОТО
  // -------------------------------------------------
  async function takePhoto() {
    // Проверяем разрешения перед съемкой
    if (!permission?.granted) {
      Alert.alert(
        t("common.error"),
        t("scan.cameraPermission") || "Нужен доступ к камере",
        [{ text: t("common.ok") }]
      );
      return;
    }

    // Проверяем, что камера готова
    if (!cameraRef.current) {
      console.log("❌ Camera ref is null");
      showNotification(t("scan.cameraError"), "error");
      return;
    }

    setLoading(true);
      showNotification(t("scan.analyzing"), "info");

    try {
      // Небольшая задержка для инициализации камеры
      await new Promise(resolve => setTimeout(resolve, 100));

      const pic = await cameraRef.current.takePictureAsync({ 
        base64: true,
        quality: 0.8,
        skipProcessing: false,
        // Отключаем звук на всех платформах
        mute: true,
      });

      if (!pic || !pic.base64) {
        throw new Error("Фото не было создано или отсутствует base64");
      }

      setPhoto(pic);
      await analyzePhoto(pic.base64, pic.uri);
      showNotification(t("scan.analysisComplete"), "success");
    } catch (e: any) {
      console.log("❌ Camera error:", e);
      const errorMessage = e?.message || String(e) || "Неизвестная ошибка";
      console.log("❌ Camera error details:", errorMessage);
      showNotification(t("scan.cameraError"), "error");
    } finally {
      setLoading(false);
    }
  }

  // -------------------------------------------------
  // 🤖 GEMINI 2.5 FLASH - ОБЪЕДИНЕННЫЙ ЗАПРОС
  // -------------------------------------------------
  async function analyzePhoto(base64: string, photoUri: string) {
    setResult(t("scan.analyzing"));

    // Получаем список существующих лекарств для проверки совместимости
    const existingMedicines = user?.id ? await getAllMedicines(user.id) : [];
    const existingMedicineNames = existingMedicines.map((m: any) => m.name).filter(Boolean);

    const promptText =
      language === "ru"
        ? `Проанализируй упаковку лекарства на фотографии и верни СТРОГО JSON:

🚨 КРИТИЧЕСКИ ВАЖНО: В поле "name" указывай ТОЛЬКО ТОРГОВОЕ НАЗВАНИЕ ЛЕКАРСТВА (коммерческое название, бренд), БЕЗ действующего вещества!

📦 ИНФОРМАЦИЯ С УПАКОВКИ (извлекай только то, что видно на фотографии):
- Название лекарства (торговое название)
- Дозировка
- Форма выпуска
- Срок годности (expiry)
- Производитель
- Объем/количество в упаковке

🌐 ИНФОРМАЦИЯ ИЗ ИНТЕРНЕТА/ИНСТРУКЦИИ (используй свои знания об инструкции к этому лекарству):
Для следующих полей НЕ ищи информацию на упаковке, а используй свои знания об официальной инструкции к лекарству, которую можно найти в интернете:
- forbiddenFoods (запрещенные продукты)
- recommendedFoods (рекомендуемые продукты)
- alcoholInteraction (взаимодействие с алкоголем)
- caffeineInteraction (взаимодействие с кофе/чаем)
- storageConditions (условия хранения - температура, можно ли в холодильнике)
- sideEffects (побочные эффекты)
- contraindications (противопоказания)
- incompatibleMedicines (несовместимые препараты)
- compatibleMedicines (совместимые препараты)

ВАЖНО: Если информации нет в инструкции или ты не уверен, верни "Информация не указана" или пустой массив.

📋 ПРАВИЛА РАСПОЗНАВАНИЯ НАЗВАНИЯ:
1. НИКОГДА не включай действующее вещество в название - это ОШИБКА!
2. Действующие вещества обычно написаны мелким шрифтом или в скобках
3. Торговое название обычно написано КРУПНЫМ ШРИФТОМ, выделено, находится в центре упаковки
4. Если на упаковке написано "Парацетамол 500мг" - это действующее вещество, НЕ используй его. Ищи торговое название (например, "Панадол", "Эффералган", "Тайленол")
5. Если на упаковке написано "Cipralex" или "ESTO 10" - это торговые названия, используй их
6. Если на упаковке написано "Escitalopram (Cipralex)" - используй ТОЛЬКО "Cipralex", БЕЗ "Escitalopram"
7. Если на упаковке указано только действующее вещество без торгового названия, попробуй найти наиболее распространенное торговое название для этого вещества
8. Если на упаковке несколько торговых названий, выбери ОДНО основное (самое крупное или первое)
9. ВНИМАТЕЛЬНО изучи всю упаковку - название может быть на разных сторонах
10. Если название написано на иностранном языке, используй его как есть (например, "Cipralex", "Panadol")

❌ ЧАСТЫЕ ОШИБКИ (НЕ ДЕЛАЙ ТАК):
- "Парацетамол" → НЕПРАВИЛЬНО (это действующее вещество)
- "Амоксициллин" → НЕПРАВИЛЬНО (это действующее вещество)
- "Ибупрофен" → НЕПРАВИЛЬНО (это действующее вещество)
- "Ацетилсалициловая кислота" → НЕПРАВИЛЬНО (это действующее вещество)

✅ ПРАВИЛЬНЫЕ ПРИМЕРЫ:
- "Панадол" (НЕ "Парацетамол" и НЕ "Парацетамол Панадол")
- "Эффералган" (НЕ "Парацетамол")
- "Амоксиклав" (НЕ "Амоксициллин" и НЕ "Амоксициллин Амоксиклав")
- "Флемоксин" (НЕ "Амоксициллин")
- "Cipralex" (НЕ "Escitalopram" и НЕ "Escitalopram (Cipralex)")
- "Нурофен" (НЕ "Ибупрофен")
- "Аспирин" (НЕ "Ацетилсалициловая кислота")

🔍 КАК ОПРЕДЕЛИТЬ ТОРГОВОЕ НАЗВАНИЕ:
- Ищи самое крупное и заметное название на упаковке
- Обычно это название бренда/производителя
- Торговое название часто имеет уникальный шрифт или дизайн
- Действующее вещество обычно указано мелким шрифтом или в составе

{
  "name": "ТОЛЬКО ТОРГОВОЕ НАЗВАНИЕ (без действующего вещества!)",
  "internationalName": "международное непатентованное название (МНН)",
  "manufacturer": "производитель",
  "form": "форма выпуска (таблетки, капсулы, сироп, капли, мазь, суспензия и т.д.)",
  "dose": "дозировка (200 mg, 20 ml, 5 mg/ml и т.д.)",
  "packageVolume": "объём / количество в упаковке",
  "category": "категория лекарства (обезболивающее, жаропонижающее, антибиотик и т.д.)",
  "activeIngredients": [
    {
      "name": "название действующего вещества",
      "dose": "дозировка этого вещества",
      "action": "химическое/фармакологическое действие (например: НПВС, снижает боль, температуру, воспаление)"
    }
  ],
  "indications": {
    "conditions": ["при каких состояниях применяется"],
    "forAdults": "для взрослых - описание",
    "forChildren": {
      "minAge": "минимальный возраст",
      "dosage": "дозировка для детей",
      "description": "описание применения для детей"
    },
    "diagnoses": {
      "allowed": ["при каких диагнозах разрешён"],
      "notRecommended": ["при каких диагнозах нежелателен"]
    }
  },
  "contraindications": {
    "pregnancy": "можно ли при беременности (да/нет/с осторожностью) и описание",
    "lactation": "можно ли при лактации (да/нет/с осторожностью) и описание",
    "ageRestrictions": "возрастные ограничения",
    "allergies": "аллергия на компоненты",
    "liverDiseases": "заболевания печени",
    "kidneyDiseases": "болезни почек",
    "gastrointestinalDiseases": "болезни ЖКТ",
    "cardiovascularDiseases": "сердечно-сосудистые заболевания",
    "other": ["другие противопоказания"]
  },
  "warnings": {
    "alcohol": "когда нельзя комбинировать с алкоголем (описание)",
    "bleedingRisk": "риск кровотечений",
    "allergicReactions": "риск аллергических реакций",
    "overdoseRisk": "риск передозировки",
    "chronicDiseases": "особое внимание при хронических заболеваниях"
  },
  "foodCompatibility": {
    "takeBeforeMeal": "принимать до еды (да/нет/опционально)",
    "takeAfterMeal": "принимать после еды (да/нет/опционально)",
    "takeWithMeal": "принимать во время еды (да/нет/опционально)",
    "drinkWithWater": "запивать большим количеством воды (да/нет)",
    "avoidMilk": "нельзя сочетать с молоком (да/нет)",
    "avoidCaffeine": "нельзя сочетать с кофеином (да/нет)",
    "stomachIrritation": "препарат раздражает желудок → лучше принимать после еды (да/нет)",
    "otherFoodInstructions": "другие инструкции по приёму с едой"
  },
  "drugCompatibility": {
    "dangerousCombinations": ["опасные комбинации (например: ибупрофен + аспирин)"],
    "reducedEffect": ["препараты, снижающие действие"],
    "increasedToxicity": ["препараты, усиливающие токсичность"],
    "incompatibleMedicines": ["название1", "название2"],
    "compatibleMedicines": [
      {
        "medicineName": "название",
        "instructions": "как принимать совместно",
        "timeInterval": "интервал между приемами"
      }
    ]
  },
  "dosage": {
    "forAdults": {
      "dose": "дозировка для взрослых",
      "maxDaily": "максимальная суточная норма",
      "interval": "интервал между приёмами"
    },
    "forChildren": {
      "byAge": "дозировка по возрасту",
      "byWeight": "дозировка по массе тела"
    }
  },
  "childrenRestrictions": {
    "minAge": "минимальный возраст",
    "recommendedDosage": "рекомендованная дозировка",
    "suitableForms": ["формы выпуска, подходящие детям"]
  },
  "sideEffects": {
    "mild": ["лёгкие (тошнота, головная боль)"],
    "moderate": ["средние (сыпь, сонливость)"],
    "severe": ["тяжёлые (анафилаксия, кровотечения)"],
    "frequency": "частота побочных эффектов, если известна"
  },
  "storageConditions": {
    "temperature": "температура хранения",
    "expiry": "срок годности в формате ММ.ГГГГ (только месяц и год, например: 12.2025)",
    "refrigerator": "можно ли хранить в холодильнике (да/нет)",
    "transportable": "можно ли переносить (да/нет)"
  },
  "additionalRecommendations": {
    "driving": "можно ли водить машину (да/нет/с осторожностью)",
    "sports": "можно ли заниматься спортом (да/нет/с осторожностью)",
    "heat": "безопасно ли при жаре/высоких нагрузках (да/нет/с осторожностью)",
    "vitamins": "можно ли применять вместе с витаминами (да/нет/с осторожностью)",
    "diabetes": "безопасность при диабете (да/нет/с осторожностью)"
  },
  "specialGroupsInfo": {
    "pregnant": {
      "allowed": "можно ли при беременности (да/нет/с осторожностью)",
      "trimester": {
        "first": "можно ли в первом триместре (да/нет/с осторожностью) и описание",
        "second": "можно ли во втором триместре (да/нет/с осторожностью) и описание",
        "third": "можно ли в третьем триместре (да/нет/с осторожностью) и описание"
      },
      "risks": "риски для плода",
      "dosage": "особенности дозировки при беременности",
      "warnings": "предупреждения для беременных"
    },
    "lactating": {
      "allowed": "можно ли при кормлении грудью (да/нет/с осторожностью)",
      "passesToMilk": "проникает ли в грудное молоко (да/нет)",
      "risks": "риски для ребенка",
      "dosage": "особенности дозировки при кормлении",
      "warnings": "предупреждения для кормящих",
      "alternatives": "альтернативные препараты при кормлении"
    },
    "children": {
      "minAge": "минимальный возраст применения",
      "dosageByAge": {
        "0-2": "дозировка для детей 0-2 лет",
        "2-6": "дозировка для детей 2-6 лет",
        "6-12": "дозировка для детей 6-12 лет",
        "12-18": "дозировка для детей 12-18 лет"
      },
      "dosageByWeight": "дозировка по массе тела (мг/кг)",
      "suitableForms": ["формы выпуска, подходящие детям"],
      "risks": "риски для детей",
      "warnings": "предупреждения для детей",
      "contraindications": "противопоказания для детей"
    },
    "elderly": {
      "allowed": "можно ли пожилым (да/нет/с осторожностью)",
      "dosageAdjustment": "нужна ли корректировка дозировки для пожилых",
      "reducedDosage": "рекомендуемая дозировка для пожилых",
      "risks": "риски для пожилых",
      "warnings": "предупреждения для пожилых",
      "interactions": "особенности взаимодействия с другими препаратами у пожилых"
    },
    "chronicDiseases": {
      "liverDiseases": {
        "allowed": "можно ли при заболеваниях печени (да/нет/с осторожностью)",
        "dosageAdjustment": "нужна ли корректировка дозировки",
        "warnings": "предупреждения при заболеваниях печени"
      },
      "kidneyDiseases": {
        "allowed": "можно ли при заболеваниях почек (да/нет/с осторожностью)",
        "dosageAdjustment": "нужна ли корректировка дозировки",
        "warnings": "предупреждения при заболеваниях почек"
      },
      "heartDiseases": {
        "allowed": "можно ли при заболеваниях сердца (да/нет/с осторожностью)",
        "dosageAdjustment": "нужна ли корректировка дозировки",
        "warnings": "предупреждения при заболеваниях сердца"
      },
      "diabetes": {
        "allowed": "можно ли при диабете (да/нет/с осторожностью)",
        "affectsSugar": "влияет ли на уровень сахара (да/нет)",
        "warnings": "предупреждения при диабете"
      },
      "gastrointestinalDiseases": {
        "allowed": "можно ли при заболеваниях ЖКТ (да/нет/с осторожностью)",
        "warnings": "предупреждения при заболеваниях ЖКТ"
      },
      "other": {
        "asthma": "можно ли при астме (да/нет/с осторожностью) и описание",
        "epilepsy": "можно ли при эпилепсии (да/нет/с осторожностью) и описание",
        "thyroidDiseases": "можно ли при заболеваниях щитовидной железы (да/нет/с осторожностью) и описание"
      }
    }
  },
  "analogs": [
    {
      "name": "название аналога/заменителя",
      "activeIngredient": "действующее вещество",
      "manufacturer": "производитель",
      "similarity": "степень схожести (полный аналог/частичный аналог)",
      "differences": "отличия от оригинального препарата",
      "priceRange": "примерный диапазон цен (если известен)"
    }
  ],
  "forbiddenFoods": ["продукт1", "продукт2"], // ИЗ ИНСТРУКЦИИ: запрещенные продукты при приеме этого лекарства
  "recommendedFoods": ["продукт1", "продукт2"], // ИЗ ИНСТРУКЦИИ: рекомендуемые продукты
  "alcoholInteraction": "описание взаимодействия с алкоголем", // ИЗ ИНСТРУКЦИИ: можно ли сочетать с алкоголем
  "caffeineInteraction": "описание взаимодействия с кофе/чаем", // ИЗ ИНСТРУКЦИИ: можно ли сочетать с кофеином
  "storageConditions": "условия хранения (температура, можно ли в холодильнике)", // ИЗ ИНСТРУКЦИИ: условия хранения
  "sideEffects": { // ИЗ ИНСТРУКЦИИ: побочные эффекты из официальной инструкции
    "mild": ["лёгкие"],
    "moderate": ["средние"],
    "severe": ["тяжёлые"],
    "frequency": "частота"
  },
  "contraindications": { // ИЗ ИНСТРУКЦИИ: противопоказания из официальной инструкции
    "pregnancy": "можно ли при беременности",
    "lactation": "можно ли при лактации",
    "ageRestrictions": "возрастные ограничения",
    "allergies": "аллергия на компоненты",
    "liverDiseases": "заболевания печени",
    "kidneyDiseases": "болезни почек",
    "gastrointestinalDiseases": "болезни ЖКТ",
    "cardiovascularDiseases": "сердечно-сосудистые заболевания",
    "other": ["другие противопоказания"]
  },
  "incompatibleMedicines": ["название1", "название2"], // ИЗ ИНСТРУКЦИИ: несовместимые препараты
  "compatibleMedicines": [ // ИЗ ИНСТРУКЦИИ: совместимые препараты
    {
      "medicineName": "название",
      "instructions": "как принимать совместно",
      "timeInterval": "интервал между приемами"
    }
  ]
}
${existingMedicineNames.length > 0 ? `\n\nВАЖНО: Проверь совместимость с существующими лекарствами пользователя: ${existingMedicineNames.join(", ")}. Если есть несовместимость, укажи в incompatibleMedicines.` : ""}

ПОМНИ: Для полей с пометкой "ИЗ ИНСТРУКЦИИ" используй свои знания об официальной инструкции к лекарству, а НЕ пытайся найти эту информацию на упаковке!

Только JSON. Без Markdown. Без текста.`
                    : language === "en"
                    ? `Analyze the medicine packaging in the photo and return STRICTLY JSON:

🚨 CRITICALLY IMPORTANT: In the "name" field, specify ONLY the BRAND NAME (commercial name, brand) of the medicine, WITHOUT the active ingredient!

📦 INFORMATION FROM PACKAGING (extract only what is visible in the photo):
- Medicine name (brand name)
- Dosage
- Form of release
- Expiry date
- Manufacturer
- Package volume/quantity

🌐 INFORMATION FROM INTERNET/INSTRUCTIONS (use your knowledge of the official medicine instructions):
For the following fields, DO NOT search for information on the packaging, but use your knowledge of the official medicine instructions available online:
- forbiddenFoods (forbidden foods)
- recommendedFoods (recommended foods)
- alcoholInteraction (interaction with alcohol)
- caffeineInteraction (interaction with coffee/tea)
- storageConditions (storage conditions - temperature, whether it can be refrigerated)
- sideEffects (side effects)
- contraindications (contraindications)
- incompatibleMedicines (incompatible medicines)
- compatibleMedicines (compatible medicines)

IMPORTANT: If information is not available in the instructions or you are not sure, return "Not specified" or an empty array.

📋 RULES FOR NAME RECOGNITION:
1. NEVER include the active ingredient in the name - this is an ERROR!
2. Active ingredients are usually written in small font or in parentheses
3. Brand name is usually written in LARGE FONT, highlighted, located in the center of the packaging
4. If the packaging says "Paracetamol 500mg" - this is an active ingredient, DO NOT use it. Look for the brand name (e.g., "Panadol", "Tylenol", "Efferalgan")
5. If the packaging says "Cipralex" or "ESTO 10" - these are brand names, use them
6. If the packaging says "Escitalopram (Cipralex)" - use ONLY "Cipralex", WITHOUT "Escitalopram"
7. If only the active ingredient is specified without a brand name, try to find the most common brand name for this substance
8. If there are multiple brand names on the packaging, choose ONE main name (the largest or first one)
9. CAREFULLY examine the entire packaging - the name may be on different sides
10. If the name is written in a foreign language, use it as is (e.g., "Cipralex", "Panadol")

❌ COMMON MISTAKES (DON'T DO THIS):
- "Paracetamol" → WRONG (this is an active ingredient)
- "Amoxicillin" → WRONG (this is an active ingredient)
- "Ibuprofen" → WRONG (this is an active ingredient)
- "Acetylsalicylic acid" → WRONG (this is an active ingredient)

✅ CORRECT EXAMPLES:
- "Panadol" (NOT "Paracetamol" and NOT "Paracetamol Panadol")
- "Tylenol" (NOT "Paracetamol")
- "Amoxiclav" (NOT "Amoxicillin" and NOT "Amoxicillin Amoxiclav")
- "Flemoxin" (NOT "Amoxicillin")
- "Cipralex" (NOT "Escitalopram" and NOT "Escitalopram (Cipralex)")
- "Nurofen" (NOT "Ibuprofen")
- "Aspirin" (NOT "Acetylsalicylic acid")

🔍 HOW TO IDENTIFY BRAND NAME:
- Look for the largest and most noticeable name on the packaging
- Usually this is the brand/manufacturer name
- Brand name often has a unique font or design
- Active ingredient is usually indicated in small font or in the composition

{
  "name": "ONLY BRAND NAME (without active ingredient!)",
  "dose": "dosage (e.g., 500mg)",
  "form": "form of release (tablets, capsules, syrup, etc.)",
  "expiry": "expiry date in MM.YYYY format (month and year only, e.g.: 12.2025)",
  "incompatibleMedicines": ["name1", "name2"],
  "compatibleMedicines": [
    {
      "medicineName": "name",
      "instructions": "how to take together",
      "timeInterval": "interval between doses"
    }
  ],
  "forbiddenFoods": ["food1", "food2"], // FROM INSTRUCTIONS: forbidden foods when taking this medicine
  "recommendedFoods": ["food1", "food2"], // FROM INSTRUCTIONS: recommended foods
  "alcoholInteraction": "description of alcohol interaction", // FROM INSTRUCTIONS: can it be combined with alcohol
  "caffeineInteraction": "description of coffee/tea interaction", // FROM INSTRUCTIONS: can it be combined with caffeine
  "storageConditions": "storage conditions (temperature, whether it can be refrigerated)", // FROM INSTRUCTIONS: storage conditions
  "sideEffects": { // FROM INSTRUCTIONS: side effects from official instructions
    "mild": ["mild"],
    "moderate": ["moderate"],
    "severe": ["severe"],
    "frequency": "frequency"
  },
  "contraindications": { // FROM INSTRUCTIONS: contraindications from official instructions
    "pregnancy": "can it be used during pregnancy",
    "lactation": "can it be used during lactation",
    "ageRestrictions": "age restrictions",
    "allergies": "allergy to components",
    "liverDiseases": "liver diseases",
    "kidneyDiseases": "kidney diseases",
    "gastrointestinalDiseases": "gastrointestinal diseases",
    "cardiovascularDiseases": "cardiovascular diseases",
    "other": ["other contraindications"]
  },
  "incompatibleMedicines": ["name1", "name2"], // FROM INSTRUCTIONS: incompatible medicines
  "compatibleMedicines": [ // FROM INSTRUCTIONS: compatible medicines
    {
      "medicineName": "name",
      "instructions": "how to take together",
      "timeInterval": "interval between doses"
    }
  ],
  "specialGroupsInfo": {
    "pregnant": {
      "allowed": "can it be used during pregnancy (yes/no/with caution)",
      "trimester": {
        "first": "can it be used in first trimester (yes/no/with caution) and description",
        "second": "can it be used in second trimester (yes/no/with caution) and description",
        "third": "can it be used in third trimester (yes/no/with caution) and description"
      },
      "risks": "risks to fetus",
      "dosage": "dosage features during pregnancy",
      "warnings": "warnings for pregnant women"
    },
    "lactating": {
      "allowed": "can it be used during breastfeeding (yes/no/with caution)",
      "passesToMilk": "does it pass into breast milk (yes/no)",
      "risks": "risks to child",
      "dosage": "dosage features during breastfeeding",
      "warnings": "warnings for lactating women",
      "alternatives": "alternative medicines during breastfeeding"
    },
    "children": {
      "minAge": "minimum age for use",
      "dosageByAge": {
        "0-2": "dosage for children 0-2 years",
        "2-6": "dosage for children 2-6 years",
        "6-12": "dosage for children 6-12 years",
        "12-18": "dosage for children 12-18 years"
      },
      "dosageByWeight": "dosage by body weight (mg/kg)",
      "suitableForms": ["forms suitable for children"],
      "risks": "risks for children",
      "warnings": "warnings for children",
      "contraindications": "contraindications for children"
    },
    "elderly": {
      "allowed": "can it be used by elderly (yes/no/with caution)",
      "dosageAdjustment": "is dosage adjustment needed for elderly",
      "reducedDosage": "recommended dosage for elderly",
      "risks": "risks for elderly",
      "warnings": "warnings for elderly",
      "interactions": "interaction features with other medicines in elderly"
    },
    "chronicDiseases": {
      "liverDiseases": {
        "allowed": "can it be used with liver diseases (yes/no/with caution)",
        "dosageAdjustment": "is dosage adjustment needed",
        "warnings": "warnings with liver diseases"
      },
      "kidneyDiseases": {
        "allowed": "can it be used with kidney diseases (yes/no/with caution)",
        "dosageAdjustment": "is dosage adjustment needed",
        "warnings": "warnings with kidney diseases"
      },
      "heartDiseases": {
        "allowed": "can it be used with heart diseases (yes/no/with caution)",
        "dosageAdjustment": "is dosage adjustment needed",
        "warnings": "warnings with heart diseases"
      },
      "diabetes": {
        "allowed": "can it be used with diabetes (yes/no/with caution)",
        "affectsSugar": "does it affect blood sugar (yes/no)",
        "warnings": "warnings with diabetes"
      },
      "gastrointestinalDiseases": {
        "allowed": "can it be used with gastrointestinal diseases (yes/no/with caution)",
        "warnings": "warnings with gastrointestinal diseases"
      },
      "other": {
        "asthma": "can it be used with asthma (yes/no/with caution) and description",
        "epilepsy": "can it be used with epilepsy (yes/no/with caution) and description",
        "thyroidDiseases": "can it be used with thyroid diseases (yes/no/with caution) and description"
      }
    }
  },
  "analogs": [
    {
      "name": "analog/substitute name",
      "activeIngredient": "active ingredient",
      "manufacturer": "manufacturer",
      "similarity": "similarity degree (full analog/partial analog)",
      "differences": "differences from original medicine",
      "priceRange": "approximate price range (if known)"
    }
  ]
}
${existingMedicineNames.length > 0 ? `\n\nIMPORTANT: Check compatibility with user's existing medicines: ${existingMedicineNames.join(", ")}. If there is incompatibility, specify in incompatibleMedicines.` : ""}

REMEMBER: For fields marked "FROM INSTRUCTIONS", use your knowledge of the official medicine instructions, and DO NOT try to find this information on the packaging!

Only JSON. No Markdown. No text.`
                    : `נתח את אריזת התרופה בתמונה והחזר JSON בלבד:

חשוב מאוד: בשדה "name" ציין רק את שם המותג (השם המסחרי) של התרופה, ללא החומר הפעיל!

📦 מידע מהאריזה (חלץ רק מה שנראה בתמונה):
- שם התרופה (שם מותג)
- מינון
- צורת שחרור
- תאריך תפוגה
- יצרן
- נפח/כמות באריזה

🌐 מידע מהאינטרנט/הוראות (השתמש בידע שלך על הוראות התרופה הרשמיות):
עבור השדות הבאים, אל תחפש מידע על האריזה, אלא השתמש בידע שלך על הוראות התרופה הרשמיות הזמינות באינטרנט:
- forbiddenFoods (מזונות אסורים)
- recommendedFoods (מזונות מומלצים)
- alcoholInteraction (אינטראקציה עם אלכוהול)
- caffeineInteraction (אינטראקציה עם קפה/תה)
- storageConditions (תנאי אחסון - טמפרטורה, האם ניתן לשמור במקרר)
- sideEffects (תופעות לוואי)
- contraindications (התוויות נגד)
- incompatibleMedicines (תרופות לא תואמות)
- compatibleMedicines (תרופות תואמות)

חשוב: אם המידע לא זמין בהוראות או שאתה לא בטוח, החזר "לא צוין" או מערך ריק.

כללים:
1. לעולם אל תכלול את החומר הפעיל בשם
2. אם על האריזה כתוב "פרצטמול 500 מ"ג" - זה חומר פעיל, אל תשתמש בו. חפש את שם המותג (למשל "אקמול")
3. אם על האריזה כתוב "Cipralex" או "ESTO 10" - אלה שמות מותג, השתמש בהם
4. אם על האריזה כתוב "Escitalopram (Cipralex)" - השתמש רק ב-"Cipralex", ללא "Escitalopram"
5. אם מצוין רק חומר פעיל ללא שם מותג, נסה למצוא את שם המותג הנפוץ ביותר לחומר זה
6. אם יש כמה שמות מותג על האריזה, בחר אחד עיקרי (הגדול ביותר או הראשון)
7. בדוק בקפידה את כל האריזה - השם עשוי להיות בצדדים שונים
8. אם השם כתוב בשפה זרה, השתמש בו כפי שהוא (למשל "Cipralex", "Panadol")

דוגמאות לתשובות נכונות:
- "Cipralex" (לא "Escitalopram" ולא "Escitalopram (Cipralex)")
- "אקמול" (לא "פרצטמול" ולא "פרצטמול אקמול")
- "מוקסיפן" (לא "אמוקסיצילין" ולא "אמוקסיצילין מוקסיפן")

{
  "name": "רק שם המותג (ללא החומר הפעיל!)",
  "dose": "מינון (למשל, 500mg)",
  "form": "צורת שחרור (טבליות, כמוסות, סירופ וכו')",
  "expiry": "תאריך תפוגה בפורמט MM.YYYY (חודש ושנה בלבד, למשל: 12.2025)",
  "incompatibleMedicines": ["שם1", "שם2"],
  "compatibleMedicines": [
    {
      "medicineName": "שם",
      "instructions": "איך לקחת יחד",
      "timeInterval": "מרווח בין מנות"
    }
  ],
  "forbiddenFoods": ["מזון1", "מזון2"], // מהוראות: מזונות אסורים בעת נטילת תרופה זו
  "recommendedFoods": ["מזון1", "מזון2"], // מהוראות: מזונות מומלצים
  "alcoholInteraction": "תיאור אינטראקציה עם אלכוהול", // מהוראות: האם ניתן לשלב עם אלכוהול
  "caffeineInteraction": "תיאור אינטראקציה עם קפה/תה", // מהוראות: האם ניתן לשלב עם קפאין
  "storageConditions": "תנאי אחסון (טמפרטורה, האם ניתן לשמור במקרר)", // מהוראות: תנאי אחסון
  "sideEffects": { // מהוראות: תופעות לוואי מהוראות רשמיות
    "mild": ["קלות"],
    "moderate": ["בינוניות"],
    "severe": ["חמורות"],
    "frequency": "תדירות"
  },
  "contraindications": { // מהוראות: התוויות נגד מהוראות רשמיות
    "pregnancy": "האם ניתן להשתמש בהריון",
    "lactation": "האם ניתן להשתמש בהנקה",
    "ageRestrictions": "הגבלות גיל",
    "allergies": "אלרגיה לרכיבים",
    "liverDiseases": "מחלות כבד",
    "kidneyDiseases": "מחלות כליות",
    "gastrointestinalDiseases": "מחלות מערכת העיכול",
    "cardiovascularDiseases": "מחלות לב וכלי דם",
    "other": ["התוויות נגד אחרות"]
  },
  "incompatibleMedicines": ["שם1", "שם2"], // מהוראות: תרופות לא תואמות
  "compatibleMedicines": [ // מהוראות: תרופות תואמות
    {
      "medicineName": "שם",
      "instructions": "איך לקחת יחד",
      "timeInterval": "מרווח בין מנות"
    }
  ],
  "specialGroupsInfo": {
    "pregnant": {
      "allowed": "האם ניתן להשתמש בהריון (כן/לא/בזהירות)",
      "trimester": {
        "first": "האם ניתן בטרימסטר ראשון (כן/לא/בזהירות) ותיאור",
        "second": "האם ניתן בטרימסטר שני (כן/לא/בזהירות) ותיאור",
        "third": "האם ניתן בטרימסטר שלישי (כן/לא/בזהירות) ותיאור"
      },
      "risks": "סיכונים לעובר",
      "dosage": "מאפייני מינון בהריון",
      "warnings": "אזהרות לנשים בהריון"
    },
    "lactating": {
      "allowed": "האם ניתן להשתמש בהנקה (כן/לא/בזהירות)",
      "passesToMilk": "האם עובר לחלב אם (כן/לא)",
      "risks": "סיכונים לילד",
      "dosage": "מאפייני מינון בהנקה",
      "warnings": "אזהרות לנשים מניקות",
      "alternatives": "תרופות חלופיות בהנקה"
    },
    "children": {
      "minAge": "גיל מינימלי לשימוש",
      "dosageByAge": {
        "0-2": "מינון לילדים 0-2 שנים",
        "2-6": "מינון לילדים 2-6 שנים",
        "6-12": "מינון לילדים 6-12 שנים",
        "12-18": "מינון לילדים 12-18 שנים"
      },
      "dosageByWeight": "מינון לפי משקל גוף (מ"ג/ק"ג)",
      "suitableForms": ["צורות מתאימות לילדים"],
      "risks": "סיכונים לילדים",
      "warnings": "אזהרות לילדים",
      "contraindications": "התוויות נגד לילדים"
    },
    "elderly": {
      "allowed": "האם ניתן לקשישים (כן/לא/בזהירות)",
      "dosageAdjustment": "האם נדרשת התאמת מינון לקשישים",
      "reducedDosage": "מינון מומלץ לקשישים",
      "risks": "סיכונים לקשישים",
      "warnings": "אזהרות לקשישים",
      "interactions": "מאפייני אינטראקציה עם תרופות אחרות בקשישים"
    },
    "chronicDiseases": {
      "liverDiseases": {
        "allowed": "האם ניתן במחלות כבד (כן/לא/בזהירות)",
        "dosageAdjustment": "האם נדרשת התאמת מינון",
        "warnings": "אזהרות במחלות כבד"
      },
      "kidneyDiseases": {
        "allowed": "האם ניתן במחלות כליות (כן/לא/בזהירות)",
        "dosageAdjustment": "האם נדרשת התאמת מינון",
        "warnings": "אזהרות במחלות כליות"
      },
      "heartDiseases": {
        "allowed": "האם ניתן במחלות לב (כן/לא/בזהירות)",
        "dosageAdjustment": "האם נדרשת התאמת מינון",
        "warnings": "אזהרות במחלות לב"
      },
      "diabetes": {
        "allowed": "האם ניתן בסוכרת (כן/לא/בזהירות)",
        "affectsSugar": "האם משפיע על רמת הסוכר (כן/לא)",
        "warnings": "אזהרות בסוכרת"
      },
      "gastrointestinalDiseases": {
        "allowed": "האם ניתן במחלות מערכת העיכול (כן/לא/בזהירות)",
        "warnings": "אזהרות במחלות מערכת העיכול"
      },
      "other": {
        "asthma": "האם ניתן באסטמה (כן/לא/בזהירות) ותיאור",
        "epilepsy": "האם ניתן באפילפסיה (כן/לא/בזהירות) ותיאור",
        "thyroidDiseases": "האם ניתן במחלות בלוטת התריס (כן/לא/בזהירות) ותיאור"
      }
    }
  },
  "analogs": [
    {
      "name": "שם אנלוג/תחליף",
      "activeIngredient": "חומר פעיל",
      "manufacturer": "יצרן",
      "similarity": "רמת דמיון (אנלוג מלא/אנלוג חלקי)",
      "differences": "הבדלים מהתרופה המקורית",
      "priceRange": "טווח מחירים משוער (אם ידוע)"
    }
  ]
}
${existingMedicineNames.length > 0 ? `\n\nחשוב: בדוק תאימות עם תרופות קיימות של המשתמש: ${existingMedicineNames.join(", ")}. אם יש חוסר תאימות, ציין ב-incompatibleMedicines.` : ""}

זכור: עבור שדות המסומנים "מהוראות", השתמש בידע שלך על הוראות התרופה הרשמיות, ואל תנסה למצוא מידע זה על האריזה!

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
          
          setResult(t("scan.quotaExceeded"));
          Alert.alert(
            t("scan.quotaExceededTitle"),
            t("scan.quotaExceeded"),
            [
              { text: t("common.ok"), style: "default" },
              {
                text: t("scan.manualInput"),
                onPress: () => {
                  router.push("/(tabs)/home/add/manual");
                },
              },
            ]
          );
          setLoading(false);
          return;
        } else if (result.error.code === 503 || result.error.status === "UNAVAILABLE") {
          setResult("Сервис временно перегружен. Пожалуйста, попробуйте через несколько секунд.");
          Alert.alert(
            t("common.error"),
            "Сервис временно перегружен. Пожалуйста, попробуйте через несколько секунд.",
            [
              { text: t("common.ok"), style: "default" },
              {
                text: t("scan.manualInput"),
                onPress: () => {
                  router.push("/(tabs)/home/add/manual");
                },
              },
            ]
          );
          setLoading(false);
          return;
        } else {
          throw new Error(result.error.message || t("scan.analysisError"));
        }
      }

      const raw = result.text;
      setResult(raw);

      // чистим JSON
      let cleaned = raw
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) {
        console.log("❌ JSON NOT FOUND");
        setResult(t("scan.jsonNotFound"));
        return;
      }

      cleaned = match[0];

      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (e) {
        console.log("❌ JSON parse error:", e);
        console.log("❌ Raw response:", raw.substring(0, 500));
        setResult(t("scan.parseError"));
        setParsedData(null);
        return;
      }

      // Логируем распарсенные данные для отладки
      console.log("📋 Распарсенные данные от Gemini:", {
        name: parsed.name,
        hasActiveIngredients: !!parsed.activeIngredients,
        activeIngredientsType: typeof parsed.activeIngredients,
        activeIngredientsIsArray: Array.isArray(parsed.activeIngredients),
        activeIngredientsValue: parsed.activeIngredients ? JSON.stringify(parsed.activeIngredients).substring(0, 200) : null,
        hasSpecialGroupsInfo: !!parsed.specialGroupsInfo,
        hasAnalogs: !!parsed.analogs,
        hasIndications: !!parsed.indications,
        hasContraindicationsDetailed: !!parsed.contraindicationsDetailed,
        hasWarnings: !!parsed.warnings,
        allKeys: Object.keys(parsed),
      });

      // Очищаем название от действующего вещества, если оно присутствует
      if (parsed.name) {
        // Список распространенных действующих веществ (только действующие вещества, НЕ торговые названия)
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
        
        let cleanedName = parsed.name.trim();
        
        // Проверяем, не является ли само название действующим веществом
        const isActiveIngredient = activeIngredients.some(ingredient => 
          cleanedName.toLowerCase() === ingredient.toLowerCase() ||
          cleanedName.toLowerCase().startsWith(ingredient.toLowerCase() + " ")
        );
        
        if (isActiveIngredient) {
          // Если распознано действующее вещество, пытаемся найти торговое название
          // Показываем предупреждение пользователю
          console.warn("⚠️ Распознано действующее вещество вместо торгового названия:", cleanedName);
          // Оставляем название как есть, но пользователь может его исправить
        } else {
          // Если название содержит скобки, берем содержимое скобок (торговое название)
          // Примеры: "Escitalopram (Cipralex)" -> "Cipralex"
          const bracketMatch = cleanedName.match(/\(([^)]+)\)/);
          if (bracketMatch && bracketMatch[1]) {
            cleanedName = bracketMatch[1].trim();
          } else {
            // Удаляем действующее вещество из начала названия
            // Примеры: "Парацетамол Панадол" -> "Панадол"
            for (const ingredient of activeIngredients) {
              const pattern = new RegExp(`^${ingredient}\\s+`, "i");
              if (pattern.test(cleanedName)) {
                cleanedName = cleanedName.replace(pattern, "").trim();
                break;
              }
            }
          }
          
          // Если после очистки название не пустое, используем его
          if (cleanedName && cleanedName.length > 0) {
            parsed.name = cleanedName;
          }
        }
      }
      
      // Извлекаем совместимость из новой структуры или старой
      const drugCompatibility = parsed.drugCompatibility || {};
      const compatibilityInfo = {
        incompatibleMedicines: drugCompatibility.incompatibleMedicines || parsed.incompatibleMedicines || [],
        compatibleMedicines: drugCompatibility.compatibleMedicines || parsed.compatibleMedicines || [],
        forbiddenFoods: parsed.forbiddenFoods || [],
        recommendedFoods: parsed.recommendedFoods || [],
        alcoholInteraction: parsed.warnings?.alcohol || parsed.alcoholInteraction || null,
        caffeineInteraction: parsed.foodCompatibility?.avoidCaffeine ? "Нельзя сочетать с кофеином" : parsed.caffeineInteraction || null,
        sideEffects: parsed.sideEffects || null,
        contraindications: parsed.contraindications || null,
      };

      // Сохраняем все данные вместе (включая новую структуру)
      // НЕ сохраняем photoUri из интернета - используем локальное фото
      setParsedData({
        ...parsed,
        compatibilityInfo: compatibilityInfo,
      });
      setResult(t("scan.analysisComplete"));
      console.log("✅ Данные распарсены (все в одном запросе):", {
        name: parsed.name,
        hasCompatibilityInfo: !!compatibilityInfo,
        hasActiveIngredients: !!parsed.activeIngredients,
        activeIngredientsCount: Array.isArray(parsed.activeIngredients) ? parsed.activeIngredients.length : 0,
        hasSpecialGroupsInfo: !!parsed.specialGroupsInfo,
        hasAnalogs: !!parsed.analogs,
        hasIndications: !!parsed.indications,
        hasContraindicationsDetailed: !!parsed.contraindicationsDetailed,
        hasWarnings: !!parsed.warnings,
        fullData: JSON.stringify(parsed, null, 2).substring(0, 500) + "...",
      });

      // НЕ удаляем локальную фотографию - она будет сохранена
      
      // Скрываем индикатор загрузки после получения результата
      setLoading(false);

      // Если дата не найдена, показываем модальное окно для ввода
      if (!parsed.expiry || parsed.expiry.trim() === "" || parsed.expiry === "—" || parsed.expiry === "-") {
        // НЕ устанавливаем дату автоматически - пользователь должен выбрать сам
        setExpiryDate("");
        setShowExpiryModal(true);
      } else {
        // Если дата найдена при сканировании, используем её и переходим к выбору количества
        setExpiryDate(parsed.expiry);
        setShowQuantityModal(true);
      }
    } catch (e: any) {
      console.log("❌ Ошибка Gemini:", e);
      
      // Обработка ошибки превышения квоты
      if (e?.error?.code === 429 || e?.status === "RESOURCE_EXHAUSTED") {
        const retryAfter = e?.error?.message?.match(/retry in ([\d.]+)s/i)?.[1];
        const waitTime = retryAfter ? Math.ceil(parseFloat(retryAfter)) : 15;
        
        setResult("Вы превысили лимит запросов на день попробуйте снова завтра");
        Alert.alert(
          "Превышен лимит запросов",
          "Вы превысили лимит запросов на день попробуйте снова завтра",
          [
            { text: "OK", style: "default" },
            {
              text: "Ручной ввод",
              onPress: () => {
                router.push("/(tabs)/home/add/manual");
              },
            },
          ]
        );
      } else {
        setResult(t("scan.analysisError"));
        Alert.alert(
          t("scan.error"),
          t("scan.analysisError") + "\n\n" + (t("scan.analysisErrorHint") || "Попробуйте:\n\n1. Улучшить освещение\n2. Убедиться, что упаковка четко видна\n3. Использовать ручной ввод"),
          [
            { text: t("common.ok"), style: "default" },
            {
              text: t("scan.manualInput"),
              onPress: () => {
                router.push("/(tabs)/home/add/manual");
              },
            },
          ]
        );
      }
      
      setParsedData(null);
    }
  }

  // -------------------------------------------------
  // 🔄 ПРЕОБРАЗОВАНИЕ ММ.ГГГГ В ПОЛНУЮ ДАТУ (последний день месяца)
  // -------------------------------------------------
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

  // -------------------------------------------------
  // 💾 ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ СОХРАНЕНИЯ
  // -------------------------------------------------
  const performSave = async (compatibilityInfo: any, finalExpiry?: string, finalQuantity?: number, skipAllergyCheck: boolean = false) => {
    if (!parsedData || !user?.id) return;
    
    // Предотвращаем повторное сохранение - устанавливаем флаг ДО сохранения
    if (saved) {
      console.log("⚠️ Лекарство уже сохранено, пропускаем повторное сохранение");
      return;
    }

    // Проверяем аллергии перед сохранением (если не пропущена проверка)
    if (!skipAllergyCheck) {
      try {
        // Извлекаем активные ингредиенты из parsedData
        let activeIngredients = null;
        if (parsedData.activeIngredients) {
          // Если это массив объектов с полем name, извлекаем только названия
          if (Array.isArray(parsedData.activeIngredients)) {
            activeIngredients = parsedData.activeIngredients.map((ing: any) => {
              if (typeof ing === 'string') return ing;
              if (ing && typeof ing === 'object' && ing.name) return ing.name;
              return String(ing);
            });
          } else if (typeof parsedData.activeIngredients === 'string') {
            try {
              const parsed = JSON.parse(parsedData.activeIngredients);
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
        
        const allergyCheck = await checkMedicineAllergies(
          parsedData.name || "",
          user.id,
          user.allergies || undefined,
          user.name || undefined,
          activeIngredients
        );

        // Показываем предупреждение, если есть аллергии
        if (allergyCheck.hasAllergies) {
          setAllergyResult(allergyCheck);
          setShowAllergyWarning(true);
          return; // Прерываем сохранение, показываем предупреждение
        }
      } catch (error) {
        console.error("Ошибка проверки аллергий:", error);
        // Продолжаем сохранение даже при ошибке проверки аллергий
      }
    }
    
    // Устанавливаем флаг сохранения сразу, чтобы предотвратить дубликаты
    setSaved(true);

    // Используем переданную дату, или дату из модального окна, или дату из распознавания
    let expiryToSave: string | null = null;
    let rawExpiry: string | null = null;
    
    if (finalExpiry && finalExpiry.trim() !== "") {
      // Приоритет: переданная дата (из handleSaveWithExpiryAndQuantity)
      rawExpiry = finalExpiry.trim();
    } else if (expiryDate && expiryDate.trim() !== "") {
      // Второй приоритет: дата из модального окна
      rawExpiry = expiryDate.trim();
    } else if (parsedData.expiry && parsedData.expiry.trim() !== "" && parsedData.expiry !== "—" && parsedData.expiry !== "-") {
      // Третий приоритет: дата из распознавания
      rawExpiry = parsedData.expiry.trim();
    }
    
    // Проверяем, что дата обязательно указана
    // Если дата не была найдена при сканировании, она должна быть выбрана в модальном окне
    const wasExpiryFoundInScan = parsedData.expiry && parsedData.expiry.trim() !== "" && parsedData.expiry !== "—" && parsedData.expiry !== "-";
    if (!wasExpiryFoundInScan && (!rawExpiry || rawExpiry.trim() === "")) {
      Alert.alert(
        t("scan.expiryRequired") || "Срок годности обязателен",
        t("scan.expiryRequiredMessage") || "Пожалуйста, выберите срок годности лекарства. Это обязательное поле для безопасности.",
        [
          {
            text: t("common.ok") || "Понятно",
            onPress: () => {
              setShowExpiryModal(true);
            },
          },
        ]
      );
      return;
    }
    
    // Преобразуем ММ.ГГГГ в полную дату
    if (rawExpiry) {
      expiryToSave = convertMonthYearToFullDate(rawExpiry);
    }

    // Используем переданное количество, или количество из модального окна, или 1 по умолчанию
    const quantityToSave = finalQuantity || (quantity && quantity.trim() !== "" ? parseInt(quantity) : 1) || 1;

    console.log("💾 Сохранение лекарства:", {
      name: parsedData.name,
      expiry: expiryToSave,
      quantity: quantityToSave,
      finalExpiry,
      finalQuantity,
      expiryDate,
      quantityInput: quantity,
      parsedDataExpiry: parsedData.expiry,
    });

    // Сохраняем фотографию в постоянную папку на устройстве
    let photoUriToSave: string | null = null;
    if (photo && photo.uri) {
      try {
        const { saveMedicinePhotoToGallery } = await import("../../../../src/utils/medicine-photo-storage");
        // Получаем временный ID для сохранения (будет обновлен после сохранения в БД)
        const tempId = Date.now();
        const savedUri = await saveMedicinePhotoToGallery(photo.uri, tempId, user.id);
        photoUriToSave = savedUri || photo.uri; // Используем сохраненный URI или оригинальный как fallback
      } catch (error) {
        console.error("Ошибка сохранения фотографии в постоянную папку:", error);
        photoUriToSave = photo.uri; // Используем оригинальный URI как fallback
      }
    }
    
    // Извлекаем данные из новой структуры
    const foodCompatibility = parsedData.foodCompatibility || {};
    const takeWithFoodValue = foodCompatibility.takeBeforeMeal === "да" ? "до еды" :
                            foodCompatibility.takeAfterMeal === "да" ? "после еды" :
                            foodCompatibility.takeWithMeal === "да" ? "во время еды" : null;
    const takeWithLiquidValue = foodCompatibility.drinkWithWater === "да" ? "большим количеством воды" : null;
    
    await saveMedicine({
      name: parsedData.name || null,
      dose: parsedData.dose || null,
      form: parsedData.form || null,
      expiry: expiryToSave,
      photoUri: photoUriToSave,
      userId: user.id,
      serverId: null,
      takeWithFood: takeWithFoodValue,
      takeWithLiquid: takeWithLiquidValue,
      incompatibleMedicines: compatibilityInfo.incompatibleMedicines || null,
      compatibleMedicines: compatibilityInfo.compatibleMedicines || null,
      forbiddenFoods: compatibilityInfo.forbiddenFoods || null,
      recommendedFoods: compatibilityInfo.recommendedFoods || null,
      alcoholInteraction: compatibilityInfo.alcoholInteraction || null,
      caffeineInteraction: compatibilityInfo.caffeineInteraction || null,
      storageConditions: parsedData.storageConditions?.temperature || null,
      specialInstructions: null,
      sideEffects: compatibilityInfo.sideEffects || null,
      contraindications: compatibilityInfo.contraindications || 
        (compatibilityInfo.contraindicationsByCondition ? JSON.stringify(compatibilityInfo.contraindicationsByCondition) : null) || null,
      quantity: quantityToSave,
      totalPills: null, // Можно добавить позже через редактирование
      usedPills: 0,
      lowStockThreshold: 10,
      familyMemberId: selectedFamilyMemberId && !selectedFamilyMemberId.startsWith("user-") ? parseInt(selectedFamilyMemberId) : null,
      userDosage: null, // Будет заполнено при редактировании
      // Новые поля для расширенной информации - убеждаемся, что объекты преобразуются в строки
      internationalName: parsedData.internationalName || null,
      manufacturer: parsedData.manufacturer || null,
      packageVolume: parsedData.packageVolume || null,
      category: parsedData.category || null,
      activeIngredients: parsedData.activeIngredients ? (typeof parsedData.activeIngredients === 'string' ? parsedData.activeIngredients : JSON.stringify(parsedData.activeIngredients)) : null,
      indications: parsedData.indications ? (typeof parsedData.indications === 'string' ? parsedData.indications : JSON.stringify(parsedData.indications)) : null,
      contraindicationsDetailed: parsedData.contraindicationsDetailed ? (typeof parsedData.contraindicationsDetailed === 'string' ? parsedData.contraindicationsDetailed : JSON.stringify(parsedData.contraindicationsDetailed)) : null,
      warnings: parsedData.warnings ? (typeof parsedData.warnings === 'string' ? parsedData.warnings : JSON.stringify(parsedData.warnings)) : null,
      foodCompatibility: parsedData.foodCompatibility ? (typeof parsedData.foodCompatibility === 'string' ? parsedData.foodCompatibility : JSON.stringify(parsedData.foodCompatibility)) : null,
      drugCompatibility: parsedData.drugCompatibility ? (typeof parsedData.drugCompatibility === 'string' ? parsedData.drugCompatibility : JSON.stringify(parsedData.drugCompatibility)) : null,
      dosageDetailed: parsedData.dosageDetailed ? (typeof parsedData.dosageDetailed === 'string' ? parsedData.dosageDetailed : JSON.stringify(parsedData.dosageDetailed)) : null,
      childrenRestrictions: parsedData.childrenRestrictions ? (typeof parsedData.childrenRestrictions === 'string' ? parsedData.childrenRestrictions : JSON.stringify(parsedData.childrenRestrictions)) : null,
      sideEffectsDetailed: parsedData.sideEffectsDetailed ? (typeof parsedData.sideEffectsDetailed === 'string' ? parsedData.sideEffectsDetailed : JSON.stringify(parsedData.sideEffectsDetailed)) : null,
      storageConditionsDetailed: parsedData.storageConditionsDetailed ? (typeof parsedData.storageConditionsDetailed === 'string' ? parsedData.storageConditionsDetailed : JSON.stringify(parsedData.storageConditionsDetailed)) : null,
      additionalRecommendations: parsedData.additionalRecommendations ? (typeof parsedData.additionalRecommendations === 'string' ? parsedData.additionalRecommendations : JSON.stringify(parsedData.additionalRecommendations)) : null,
      specialGroupsInfo: parsedData.specialGroupsInfo ? (typeof parsedData.specialGroupsInfo === 'string' ? parsedData.specialGroupsInfo : JSON.stringify(parsedData.specialGroupsInfo)) : null,
      analogs: parsedData.analogs ? (typeof parsedData.analogs === 'string' ? parsedData.analogs : JSON.stringify(parsedData.analogs)) : null,
    });

    console.log("💾 Лекарство сохранено в локальную БД с полными данными:", {
      name: parsedData.name,
      hasActiveIngredients: !!parsedData.activeIngredients,
      hasSpecialGroupsInfo: !!parsedData.specialGroupsInfo,
      hasAnalogs: !!parsedData.analogs,
      hasIndications: !!parsedData.indications,
      hasContraindicationsDetailed: !!parsedData.contraindicationsDetailed,
    });

    setSaved(true);
    setShowExpiryModal(false);
    setShowQuantityModal(false);
    Alert.alert(
      t("common.success"),
      t("scan.success"),
      [
        {
          text: t("common.ok"),
          onPress: () => {
            router.back();
          },
        },
      ]
    );
  };

  // -------------------------------------------------
  // 💾 СОХРАНИТЬ ЛЕКАРСТВО С ИНФОРМАЦИЕЙ О СОВМЕСТИМОСТИ
  // -------------------------------------------------
  async function saveMedicineWithCompatibility() {
    if (!parsedData || !user?.id) return;

    try {
      // Проверяем аллергии перед сохранением
      // Извлекаем активные ингредиенты из parsedData
      let activeIngredients = null;
      if (parsedData.activeIngredients) {
        if (Array.isArray(parsedData.activeIngredients)) {
          activeIngredients = parsedData.activeIngredients.map((ing: any) => {
            if (typeof ing === 'string') return ing;
            if (ing && typeof ing === 'object' && ing.name) return ing.name;
            return String(ing);
          });
        } else if (typeof parsedData.activeIngredients === 'string') {
          try {
            const parsed = JSON.parse(parsedData.activeIngredients);
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
      
      const allergyCheck = await checkMedicineAllergies(
        parsedData.name || "",
        user.id,
        user.allergies || undefined,
        user.name || undefined,
        activeIngredients
      );

      // Показываем предупреждение, если есть аллергии
      if (allergyCheck.hasAllergies) {
        setAllergyResult(allergyCheck);
        setShowAllergyWarning(true);
        return;
      }

      // Используем информацию о совместимости из объединенного запроса
      const compatibilityInfo = parsedData.compatibilityInfo || {};

      // Проверяем совместимость с существующими лекарствами
      const compatibilityCheck = await checkMedicineCompatibility(
        parsedData.name || "",
        user.id,
        compatibilityInfo
      );

      if (compatibilityCheck.incompatible.length > 0) {
        const incompatibleNames = compatibilityCheck.incompatible
          .map((m) => m.medicineName)
          .join(", ");
        Alert.alert(
          "⚠️ Несовместимые препараты",
          `Это лекарство несовместимо с: ${incompatibleNames}\n\nРекомендуется проконсультироваться с врачом.`,
          [
            { text: "Отмена", style: "cancel" },
            {
              text: "Сохранить anyway",
              onPress: async () => {
                // Используем дату из распознавания или из модального окна
                const finalExpiry = expiryDate || parsedData.expiry || undefined;
                const finalQuantity = parseInt(quantity) || 1;
                // Пропускаем проверку аллергий, так как она уже была выполнена в saveMedicineWithCompatibility
                await performSave(compatibilityInfo, finalExpiry, finalQuantity, true);
              },
            },
          ]
        );
        return;
      }

      // Проверяем опасные взаимодействия
      const existingMedicines = await getAllMedicines(user.id);
      const dangerousInteractions = checkDangerousInteractions(compatibilityInfo, existingMedicines);
      
      if (dangerousInteractions.length > 0) {
        const interactionNames = dangerousInteractions.map(i => i.medicineName).join(", ");
        const severity = dangerousInteractions.some(i => i.severity === "critical") ? "critical" : "high";
        Alert.alert(
          severity === "critical" ? "🚨 Критическое взаимодействие" : "⚠️ Опасное взаимодействие",
          `Обнаружено ${severity === "critical" ? "критическое" : "опасное"} взаимодействие с: ${interactionNames}\n\n${dangerousInteractions[0].description}\n\nНЕОБХОДИМО проконсультироваться с врачом!`,
          [
            { text: "Отмена", style: "cancel" },
            {
              text: "Сохранить anyway",
              style: severity === "critical" ? "destructive" : "default",
              onPress: async () => {
                const finalExpiry = expiryDate || parsedData.expiry || undefined;
                const finalQuantity = parseInt(quantity) || 1;
                // Пропускаем проверку аллергий, так как она уже была выполнена в saveMedicineWithCompatibility
                await performSave(compatibilityInfo, finalExpiry, finalQuantity, true);
              },
            },
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
              { text: "Отмена", style: "cancel" },
              { 
                text: "Сохранить anyway", 
                style: "destructive",
                onPress: () => {
                  // Продолжаем с модальными окнами
                  if (!parsedData.expiry || parsedData.expiry.trim() === "" || parsedData.expiry === "—" || parsedData.expiry === "-") {
                    // Не устанавливаем дату автоматически - пользователь должен выбрать сам
                    setExpiryDate("");
                    setShowExpiryModal(true);
                  } else {
                    setExpiryDate(parsedData.expiry);
                    setShowQuantityModal(true);
                  }
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
              { text: "Отмена", style: "cancel" },
              { 
                text: "Понятно, продолжить", 
                onPress: () => {
                  // Продолжаем с модальными окнами
                  if (!parsedData.expiry || parsedData.expiry.trim() === "" || parsedData.expiry === "—" || parsedData.expiry === "-") {
                    // Не устанавливаем дату автоматически - пользователь должен выбрать сам
                    setExpiryDate("");
                    setShowExpiryModal(true);
                  } else {
                    setExpiryDate(parsedData.expiry);
                    setShowQuantityModal(true);
                  }
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
            { text: "Отмена", style: "cancel" },
            {
              text: "Понятно, продолжить",
              onPress: () => {
                // Продолжаем с модальными окнами
                if (!parsedData.expiry || parsedData.expiry.trim() === "" || parsedData.expiry === "—" || parsedData.expiry === "-") {
                  setShowExpiryModal(true);
                } else {
                  setExpiryDate(parsedData.expiry);
                  setShowQuantityModal(true);
                }
              },
            },
          ]
        );
        return;
      }

      // Проверяем, нужно ли показать модальные окна
      if (!parsedData.expiry || parsedData.expiry.trim() === "" || parsedData.expiry === "—" || parsedData.expiry === "-") {
        // Не устанавливаем дату автоматически - пользователь должен выбрать сам
        setExpiryDate("");
        setShowExpiryModal(true);
      } else {
        // Если дата найдена, сохраняем её в состояние и показываем модальное окно для количества
        setExpiryDate(parsedData.expiry);
        setShowQuantityModal(true);
      }
    } catch (error) {
      console.error("Error saving medicine with compatibility:", error);
      // Сохраняем без информации о совместимости в случае ошибки
      if (!parsedData.expiry || parsedData.expiry.trim() === "" || parsedData.expiry === "—" || parsedData.expiry === "-") {
        // Не устанавливаем дату автоматически - пользователь должен выбрать сам
        setExpiryDate("");
        setShowExpiryModal(true);
      } else {
        setShowQuantityModal(true);
      }
    }
  }

  async function handleSaveWithExpiryAndQuantity() {
    if (!parsedData || !user?.id) return;
    
    // Предотвращаем множественные вызовы
    if (loading || saved) return;
    setLoading(true);

    try {
      // Используем информацию о совместимости из объединенного запроса
      const compatibilityInfo = parsedData.compatibilityInfo || {};

      // Проверяем совместимость с существующими лекарствами
      const compatibilityCheck = await checkMedicineCompatibility(
        parsedData.name || "",
        user.id,
        compatibilityInfo
      );

      // Определяем дату: из модального окна, или из распознавания, или пустая
      const finalExpiry = expiryDate && expiryDate.trim() !== "" 
        ? expiryDate.trim() 
        : (parsedData.expiry && parsedData.expiry.trim() !== "" && parsedData.expiry !== "—" && parsedData.expiry !== "-")
          ? parsedData.expiry.trim()
          : undefined;

      // Определяем количество: из модального окна или 1 по умолчанию
      const finalQuantity = quantity && quantity.trim() !== "" ? parseInt(quantity) : 1;

      console.log("💾 Данные для сохранения:", {
        expiry: finalExpiry,
        quantity: finalQuantity,
        expiryDate,
        parsedDataExpiry: parsedData.expiry,
      });

      if (compatibilityCheck.incompatible.length > 0) {
        const incompatibleNames = compatibilityCheck.incompatible
          .map((m) => m.medicineName)
          .join(", ");
        Alert.alert(
          "⚠️ Несовместимые препараты",
          `Это лекарство несовместимо с: ${incompatibleNames}\n\nРекомендуется проконсультироваться с врачом.`,
          [
            { text: "Отмена", style: "cancel" },
            {
              text: "Сохранить anyway",
              onPress: async () => {
                // Пропускаем проверку аллергий, так как она уже была выполнена в saveMedicineWithCompatibility
                await performSave(compatibilityInfo, finalExpiry, finalQuantity, true);
              },
            },
          ]
        );
        return;
      }

      // Проверяем опасные взаимодействия
      const existingMedicines = await getAllMedicines(user.id);
      const dangerousInteractions = checkDangerousInteractions(compatibilityInfo, existingMedicines);
      
      if (dangerousInteractions.length > 0) {
        const interactionNames = dangerousInteractions.map(i => i.medicineName).join(", ");
        const severity = dangerousInteractions.some(i => i.severity === "critical") ? "critical" : "high";
        Alert.alert(
          severity === "critical" ? "🚨 Критическое взаимодействие" : "⚠️ Опасное взаимодействие",
          `Обнаружено ${severity === "critical" ? "критическое" : "опасное"} взаимодействие с: ${interactionNames}\n\n${dangerousInteractions[0].description}\n\nНЕОБХОДИМО проконсультироваться с врачом!`,
          [
            { text: "Отмена", style: "cancel" },
            {
              text: "Сохранить anyway",
              style: severity === "critical" ? "destructive" : "default",
              onPress: async () => {
                // Пропускаем проверку аллергий, так как она уже была выполнена в saveMedicineWithCompatibility
                await performSave(compatibilityInfo, finalExpiry, finalQuantity, true);
              },
            },
          ]
        );
        return;
      }

      await performSave(compatibilityInfo, finalExpiry, finalQuantity, false);
    } catch (error) {
      console.error("Error saving medicine with compatibility:", error);
      const finalExpiry = expiryDate && expiryDate.trim() !== "" 
        ? expiryDate.trim() 
        : (parsedData.expiry && parsedData.expiry.trim() !== "" && parsedData.expiry !== "—" && parsedData.expiry !== "-")
          ? parsedData.expiry.trim()
          : undefined;
      const finalQuantity = quantity && quantity.trim() !== "" ? parseInt(quantity) : 1;
      // При ошибке все равно проверяем аллергии перед сохранением
      await performSave({}, finalExpiry, finalQuantity, false);
    } finally {
      setLoading(false);
    }
  }


  // -------------------------------------------------
  // 💾 ДОБАВИТЬ В АПТЕЧКУ
  // -------------------------------------------------
  async function handleAddToMedkit() {
    if (!parsedData) {
      Alert.alert(t("common.error"), t("scan.noData") || "Нет данных для сохранения");
      return;
    }

    if (!user?.id) {
      Alert.alert(t("common.error"), t("scan.userNotFound") || "Пользователь не найден");
      return;
    }

    try {
      // Проверяем аллергии перед сохранением
      const { checkMedicineAllergies } = await import("../../../../src/services/allergy-check.service");
      const allergyCheck = await checkMedicineAllergies(
        parsedData.name || "",
        user.id,
        user.allergies || undefined,
        user.name || undefined
      );

      // Если есть аллергии, показываем предупреждение
      if (allergyCheck.hasAllergies) {
        const { default: AllergyWarning } = await import("../../../../src/components/AllergyWarning");
        // TODO: Показать модальное окно с предупреждением
        // Пока используем Alert для простоты
        const severity = allergyCheck.severity === "critical" ? "⚠️ ОПАСНО!" : "⚠️ Предупреждение";
        const message = allergyCheck.matches
          .map(m => `${m.substance} - ${m.memberName}`)
          .join("\n");
        
        Alert.alert(
          severity,
          `Лекарство содержит вещества, на которые есть аллергии:\n\n${message}\n\nВсе равно сохранить?`,
          [
            { text: "Отмена", style: "cancel" },
            {
              text: "Сохранить",
              style: allergyCheck.severity === "critical" ? "destructive" : "default",
              onPress: async () => {
                await saveMedicineWithCompatibility();
              },
            },
          ]
        );
        return;
      }

      // Проверяем взаимодействия с едой и аллергии на продукты
      const compatibilityInfo = (parsedData as any)?.compatibilityInfo || {};
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
              { text: "Отмена", style: "cancel" },
              {
                text: "Понятно, продолжить",
                style: "destructive",
                onPress: async () => {
                  await saveMedicineWithCompatibility();
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
              { text: "Отмена", style: "cancel" },
              {
                text: "Понятно, продолжить",
                onPress: async () => {
                  await saveMedicineWithCompatibility();
                },
              },
            ]
          );
          return;
        }
      }

      // Если аллергий нет, сохраняем лекарство
      await saveMedicineWithCompatibility();

      setSaved(true);
      Alert.alert(
        t("common.success"),
        t("scan.success"),
        [
          {
            text: t("common.ok"),
            onPress: () => {
              router.back();
            },
          },
        ]
      );
    } catch (e) {
      console.log("❌ Ошибка сохранения:", e);
      Alert.alert(t("common.error"), t("scan.saveError") || "Не удалось сохранить лекарство");
    }
  }

  // -------------------------------------------------
  // 📱 ЭКРАН РЕЗУЛЬТАТА
  // -------------------------------------------------
  if (parsedData) {
    // Показываем локальное фото, которое было сделано при сканировании
    const displayImageUri = photo ? photo.uri : null;
    
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.resultHeader, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.resultHeaderTitle, { flex: 1, textAlign: "center" }]}>{t("scan.result") || "Результат сканирования"}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView 
          style={styles.resultContainer}
          contentContainerStyle={styles.resultContent}
        >
          {displayImageUri && (
          <Image 
            source={{ uri: displayImageUri }} 
            style={styles.resultImage}
            onError={() => {
              // Тихая обработка ошибки - просто не показываем изображение
            }}
          />
        )}

        <Text style={styles.title}>{t("scan.result")}</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#4A90E2" style={{ marginVertical: 20 }} />
        ) : parsedData ? (
          <View style={styles.dataContainer}>
            <View style={[styles.dataRow, styles.dataRowFirst]}>
              <Text style={styles.dataLabel}>{t("scan.name")}</Text>
              <Text style={styles.dataValue}>
                {parsedData.name || t("scan.notSpecified")}
              </Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>{t("scan.dose")}</Text>
              <Text style={styles.dataValue}>
                {parsedData.dose || t("scan.notSpecified")}
              </Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>{t("scan.form")}</Text>
              <Text style={styles.dataValue}>
                {parsedData.form || t("scan.notSpecified")}
              </Text>
            </View>
            <View style={[styles.dataRow, styles.dataRowLast]}>
              <Text style={styles.dataLabel}>{t("scan.expiry")}</Text>
              <Text style={styles.dataValue}>
                {parsedData.expiry || t("scan.notSpecified")}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.resultText}>{result || t("scan.analyzing")}</Text>
        )}

        {parsedData && !saved && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddToMedkit}
          >
            <Text style={styles.addButtonText}>{t("scan.addToMedkit")}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => {
            // Полностью очищаем все данные для нового сканирования
            setPhoto(null);
            setResult(null);
            setParsedData(null);
            setSaved(false);
            setShowExpiryModal(false);
            setShowQuantityModal(false);
            setExpiryDate("");
            setQuantity("1");
          }}
        >
          <Text style={styles.scanText}>{t("scan.scanAgain")}</Text>
        </TouchableOpacity>

        {/* Модальное окно для ввода даты срока годности */}
        <Modal
          visible={showExpiryModal}
          onClose={() => {
            // Не позволяем закрыть модальное окно без выбора даты
            Alert.alert(
              t("scan.expiryRequired") || "Срок годности обязателен",
              t("scan.expiryRequiredMessage") || "Пожалуйста, выберите срок годности лекарства. Это обязательное поле для безопасности.",
              [
                {
                  text: t("common.ok") || "Понятно",
                  style: "default",
                },
              ]
            );
          }}
          showCloseButton={false}
          title={t("scan.expiryModalTitle") || "Срок годности не найден"}
          subtitle={t("scan.expiryModalSubtitleRequired") || "Пожалуйста, выберите месяц и год срока годности лекарства. Нажмите на поле ниже для выбора."}
          buttons={[
            {
              text: expiryDate && expiryDate.trim() !== "" && /^\d{2}\.\d{4}$/.test(expiryDate.trim())
                ? (t("common.next") || "Далее")
                : (t("scan.selectDate") || "Выбрать дату"),
              onPress: () => {
                // Если дата выбрана и валидна, сохраняем её и переходим дальше
                if (expiryDate && expiryDate.trim() !== "" && /^\d{2}\.\d{4}$/.test(expiryDate.trim())) {
                  setShowExpiryModal(false);
                  setShowQuantityModal(true);
                } else {
                  // Если дата не выбрана, показываем подсказку
                  Alert.alert(
                    t("scan.expiryNotSelected") || "Дата не выбрана",
                    t("scan.expirySelectHint") || "Пожалуйста, нажмите на поле \"Срок годности\" выше, чтобы открыть выбор месяца и года.",
                    [
                      {
                        text: t("common.ok") || "Понятно",
                        style: "default",
                      },
                    ]
                  );
                }
              },
              style: "primary",
              disabled: !expiryDate || expiryDate.trim() === "" || !/^\d{2}\.\d{4}$/.test(expiryDate.trim()),
            },
          ]}
        >
          <View style={{ marginBottom: 24, marginTop: 16, paddingHorizontal: 4, zIndex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 16, color: colors.text }}>
              {t("scan.expiryLabel") || "Срок годности (ММ.ГГГГ)"}
            </Text>
            <View style={{ zIndex: 10, elevation: 5 }}>
              <ExpiryDatePicker
                value={expiryDate}
                onChange={(value) => {
                  console.log("📅 Scan: Получена дата от ExpiryDatePicker:", value);
                  setExpiryDate(value);
                }}
                placeholder={t("scan.expiryPlaceholder") || "Нажмите, чтобы выбрать месяц и год"}
              />
            </View>
            {!expiryDate || expiryDate.trim() === "" ? (
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 12, fontStyle: "italic", lineHeight: 18 }}>
                {t("scan.expiryHint") || "Выберите месяц и год срока годности лекарства"}
              </Text>
            ) : null}
          </View>
        </Modal>

        {/* Модальное окно для ввода количества упаковок */}
        <Modal
          visible={showQuantityModal}
          onClose={() => {
            setShowQuantityModal(false);
            setQuantity("1");
          }}
          title={t("scan.quantityModalTitle")}
          subtitle={t("scan.quantityModalSubtitle")}
          buttons={[
            {
              text: t("common.cancel"),
              onPress: () => {
                setShowQuantityModal(false);
                setQuantity("1");
              },
              style: "cancel",
            },
            {
              text: t("common.save"),
              onPress: handleSaveWithExpiryAndQuantity,
              disabled: loading,
              loading: loading,
              style: "primary",
            },
          ]}
        >
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12, color: colors.text }}>
              {t("scan.quantityLabel") || "Количество упаковок"}
            </Text>
            <ModalInput
              value={quantity}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^\d]/g, "");
                setQuantity(cleaned || "1");
              }}
              placeholder="1"
              keyboardType="numeric"
              autoFocus
            />
          </View>

          <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12, color: colors.text }}>
              {t("scan.forWhom") || "Для кого это лекарство?"}
            </Text>
            <ScrollView style={{ maxHeight: 200 }}>
              {familyMembers.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    marginBottom: 8,
                    borderRadius: 8,
                    backgroundColor: selectedFamilyMemberId === String(member.id) ? colors.primary + "20" : colors.surface,
                    borderWidth: 1,
                    borderColor: selectedFamilyMemberId === String(member.id) ? colors.primary : colors.border,
                  }}
                  onPress={() => setSelectedFamilyMemberId(String(member.id))}
                >
                  <MaterialCommunityIcons
                    name={selectedFamilyMemberId === String(member.id) ? "check-circle" : "circle-outline"}
                    size={24}
                    color={selectedFamilyMemberId === String(member.id) ? colors.primary : colors.textSecondary}
                    style={{ marginRight: 12 }}
                  />
                  <Text style={{ fontSize: 16, color: colors.text, flex: 1 }}>
                    {member.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>

        {/* Модальное окно предупреждения об аллергиях */}
        <AllergyWarning
          visible={showAllergyWarning}
          result={allergyResult}
          medicineName={parsedData?.name || ""}
          onClose={async () => {
            setShowAllergyWarning(false);
            // Продолжаем сохранение после закрытия предупреждения (пользователь подтвердил)
            // Пропускаем проверку аллергий, так как она уже была выполнена и показана пользователю
            const compatibilityInfo = parsedData?.compatibilityInfo || {};
            const finalExpiry = expiryDate || parsedData?.expiry || undefined;
            const finalQuantity = parseInt(quantity) || 1;
            // Сбрасываем флаг saved, чтобы можно было сохранить
            setSaved(false);
            await performSave(compatibilityInfo, finalExpiry, finalQuantity, true);
            setAllergyResult(null);
          }}
        />
        </ScrollView>
      </View>
    );
  }

  // Вычисляем высоту экрана для анимации полоски
  const screenHeight = 1000; // Используем большую высоту для полного покрытия
  const scanLineTranslateY = scanLineAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, screenHeight],
  });

  // -------------------------------------------------
  // 📱 ОСНОВНОЙ ЭКРАН СКАНЕРА (Новый дизайн)
  // -------------------------------------------------
  return (
    <View style={styles.container}>
      {/* Камера - скрыта визуально во время загрузки, но остается активной */}
      <View style={[
        styles.cameraContainer,
        loading && !parsedData && !showExpiryModal && !showQuantityModal && styles.cameraHidden
      ]}>
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
              Наведите камеру на упаковку лекарства
            </Text>
          </Animated.View>
        )}

        {/* Нижние элементы управления */}
        <View style={styles.bottomControls}>
          {/* Красивая кнопка съемки */}
          <TouchableOpacity
            style={styles.captureButton}
            onPress={takePhoto}
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

      {/* Экран загрузки - показывается поверх камеры во время анализа */}
      {loading && !parsedData && !showExpiryModal && !showQuantityModal && (
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
              {t("scan.analyzing") || "Анализ изображения..."}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
    backgroundColor: "#000",
  },
  container: {
    flex: 1,
    backgroundColor: "#000",
    position: "relative",
  },
  cameraContainer: {
    flex: 1,
    position: "relative",
  },
  cameraHidden: {
    opacity: 0,
    position: "absolute",
    width: 0,
    height: 0,
    overflow: "hidden",
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
  // Экран загрузки (на весь экран)
  loadingScreen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    minWidth: 250,
    minHeight: 250,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
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

  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E6ED",
  },
  resultHeaderTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  resultContainer: { 
    flex: 1, 
    backgroundColor: "#F7F9FC",
  },
  resultContent: {
    padding: 20,
    alignItems: "center",
  },
  resultImage: { 
    width: "100%", 
    height: 300, 
    borderRadius: 10,
    marginBottom: 20,
  },
  title: { 
    fontSize: 20, 
    marginTop: 10, 
    marginBottom: 20,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  resultText: { 
    marginTop: 10, 
    fontSize: 16, 
    textAlign: "center",
    color: "#8E8E93",
  },
  dataContainer: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E0E6ED",
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  dataRowFirst: {
    marginTop: 0,
  },
  dataRowLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  dataLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    flex: 1,
  },
  dataValue: {
    fontSize: 16,
    color: "#4A90E2",
    flex: 2,
    textAlign: "right",
  },
  addButton: {
    marginTop: 10,
    marginBottom: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: "#34C759",
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
  },
  scanButton: {
    marginTop: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: "#4A90E2",
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  scanText: { 
    fontSize: 18, 
    color: "#fff",
    fontWeight: "600",
  },
});
