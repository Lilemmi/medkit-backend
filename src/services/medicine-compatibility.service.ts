import { getAllMedicines } from "../database/medicine.service";
import { callGeminiAPI } from "./gemini-api.service";
import { getUserMedicalConditions, getUserOrganConditions } from "../utils/user-profile.utils";

export interface CompatibilityCheck {
  isCompatible: boolean;
  severity: "none" | "low" | "medium" | "high" | "critical";
  message: string;
  recommendations?: string[];
  incompatibleSubstances?: string[];
}

export interface MedicineCompatibilityInfo {
  incompatibleMedicines: string[];
  compatibleMedicines: {
    medicineName: string;
    instructions: string;
    timeInterval?: string;
  }[];
  forbiddenFoods: string[];
  forbiddenFoodsDetailed?: {
    food: string;
    reason: string;
    severity: "critical" | "high" | "medium";
    consequences: string;
  }[];
  recommendedFoods: string[];
  foodInteractions?: {
    foodCategory: string;
    foods: string[];
    interaction: string;
    severity: "critical" | "high" | "medium" | "low";
    recommendation: string;
  }[];
  alcoholInteraction: string;
  caffeineInteraction: string;
  grapefruitInteraction?: string;
  dairyInteraction?: string;
  ironRichFoodsInteraction?: string;
  contraindications?: string; // Противопоказания (общее описание)
  contraindicationsByCondition?: {
    pregnancy?: string; // Противопоказания при беременности
    hypertension?: string; // Противопоказания при гипертонии
    asthma?: string; // Противопоказания при астме
    diabetes?: string; // Противопоказания при диабете
    kidneyDisease?: string; // Противопоказания при заболеваниях почек
    liverDisease?: string; // Противопоказания при заболеваниях печени
    heartDisease?: string; // Противопоказания при заболеваниях сердца
    [key: string]: string | undefined; // Другие состояния
  };
  sideEffects?: string; // Побочные эффекты
  dangerousInteractions?: {
    medicineName: string;
    severity: "critical" | "high" | "medium" | "low";
    description: string;
  }[]; // Опасные взаимодействия с другими препаратами
}

/**
 * Проверяет совместимость нового лекарства с существующими в аптечке
 */
export async function checkMedicineCompatibility(
  newMedicineName: string,
  userId: number,
  newMedicineInfo?: Partial<MedicineCompatibilityInfo>
): Promise<{
  incompatible: { medicineName: string; reason: string; severity: string }[];
  warnings: { medicineName: string; message: string }[];
}> {
  try {
    const existingMedicines = await getAllMedicines(userId);
    
    if (existingMedicines.length === 0) {
      return { incompatible: [], warnings: [] };
    }

    // Если есть информация о несовместимости в новом лекарстве
    if (newMedicineInfo?.incompatibleMedicines && newMedicineInfo.incompatibleMedicines.length > 0) {
      const incompatible: { medicineName: string; reason: string; severity: string }[] = [];
      
      for (const existingMed of existingMedicines) {
        const existingName = existingMed.name?.toLowerCase().trim() || "";
        
        for (const incompatibleName of newMedicineInfo.incompatibleMedicines) {
          if (existingName.includes(incompatibleName.toLowerCase()) || 
              incompatibleName.toLowerCase().includes(existingName)) {
            incompatible.push({
              medicineName: existingMed.name,
              reason: `Несовместимо с ${newMedicineName}`,
              severity: "critical",
            });
          }
        }
      }
      
      if (incompatible.length > 0) {
        return { incompatible, warnings: [] };
      }
    }

    // Проверяем существующие лекарства на несовместимость с новым
    const incompatible: { medicineName: string; reason: string; severity: string }[] = [];
    const warnings: { medicineName: string; message: string }[] = [];

    for (const existingMed of existingMedicines) {
      if (!existingMed.incompatibleMedicines) continue;
      
      try {
        const incompatibleList = JSON.parse(existingMed.incompatibleMedicines);
        if (Array.isArray(incompatibleList)) {
          for (const incompatibleName of incompatibleList) {
            if (newMedicineName.toLowerCase().includes(incompatibleName.toLowerCase()) ||
                incompatibleName.toLowerCase().includes(newMedicineName.toLowerCase())) {
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

    // Используем AI для дополнительной проверки совместимости
    try {
      const aiCheck = await checkCompatibilityWithAI(
        newMedicineName,
        existingMedicines.map(m => m.name).filter(Boolean)
      );
      
      if (aiCheck && !aiCheck.isCompatible) {
        if (aiCheck.severity === "critical" || aiCheck.severity === "high") {
          incompatible.push({
            medicineName: "AI проверка",
            reason: aiCheck.message,
            severity: aiCheck.severity,
          });
        } else {
          warnings.push({
            medicineName: "AI проверка",
            message: aiCheck.message,
          });
        }
      }
    } catch (error) {
      console.log("AI compatibility check failed:", error);
    }

    return { incompatible, warnings };
  } catch (error) {
    console.error("Error checking medicine compatibility:", error);
    return { incompatible: [], warnings: [] };
  }
}

/**
 * Проверяет совместимость лекарств с помощью AI
 */
async function checkCompatibilityWithAI(
  newMedicine: string,
  existingMedicines: string[]
): Promise<CompatibilityCheck | null> {
  if (existingMedicines.length === 0) {
    return { isCompatible: true, severity: "none", message: "" };
  }

  try {
    const prompt = `Проверь совместимость лекарства "${newMedicine}" с следующими препаратами: ${existingMedicines.join(", ")}.

Верни JSON:
{
  "isCompatible": true/false,
  "severity": "none" | "low" | "medium" | "high" | "critical",
  "message": "краткое описание проблемы или 'совместимы'",
  "recommendations": ["рекомендация 1", "рекомендация 2"],
  "incompatibleSubstances": ["название несовместимого препарата"]
}

Если препараты совместимы, верни isCompatible: true, severity: "none".
Если есть несовместимость, укажи severity: "critical" или "high".
Только JSON, без Markdown.`;

    const result = await callGeminiAPI({ prompt });

    if (result.error) {
      console.error("Ошибка при проверке совместимости:", result.error);
      return null;
    }

    const raw = result.text;

    let cleaned = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;

    cleaned = match[0];
    const parsed = JSON.parse(cleaned);

    return {
      isCompatible: parsed.isCompatible !== false,
      severity: parsed.severity || "none",
      message: parsed.message || "",
      recommendations: parsed.recommendations || [],
      incompatibleSubstances: parsed.incompatibleSubstances || [],
    };
  } catch (error) {
    console.error("AI compatibility check error:", error);
    return null;
  }
}

/**
 * Получает информацию о совместимости и правилах приема лекарства с помощью AI
 */
export async function getMedicineCompatibilityInfo(
  medicineName: string,
  language: string = "ru"
): Promise<Partial<MedicineCompatibilityInfo>> {
  try {
    const prompt = language === "ru"
      ? `Дай полную информацию о правильном приеме лекарства "${medicineName}".

Верни СТРОГО JSON:
{
  "incompatibleMedicines": ["название1", "название2"],
  "compatibleMedicines": [
    {
      "medicineName": "название",
      "instructions": "как принимать совместно",
      "timeInterval": "интервал между приемами"
    }
  ],
  "forbiddenFoods": ["продукт1", "продукт2"],
  "forbiddenFoodsDetailed": [
    {
      "food": "название продукта",
      "reason": "причина запрета",
      "severity": "critical" | "high" | "medium",
      "consequences": "последствия приема"
    }
  ],
  "recommendedFoods": ["продукт1", "продукт2"],
  "foodInteractions": [
    {
      "foodCategory": "категория (молочные, цитрусовые, жирная пища и т.д.)",
      "foods": ["конкретные продукты"],
      "interaction": "описание взаимодействия",
      "severity": "critical" | "high" | "medium" | "low",
      "recommendation": "рекомендация по приему"
    }
  ],
  "alcoholInteraction": "описание взаимодействия с алкоголем",
  "caffeineInteraction": "описание взаимодействия с кофе/чаем",
  "grapefruitInteraction": "взаимодействие с грейпфрутом (если есть)",
  "dairyInteraction": "взаимодействие с молочными продуктами (если есть)",
  "ironRichFoodsInteraction": "взаимодействие с продуктами, богатыми железом (если есть)",
  "contraindications": "общее описание противопоказаний",
  "contraindicationsByCondition": {
    "pregnancy": "можно ли при беременности, риски, триместр",
    "hypertension": "можно ли при гипертонии, влияние на давление",
    "asthma": "можно ли при астме, влияние на дыхание",
    "diabetes": "можно ли при диабете, влияние на сахар",
    "kidneyDisease": "можно ли при заболеваниях почек",
    "liverDisease": "можно ли при заболеваниях печени",
    "heartDisease": "можно ли при заболеваниях сердца"
  },
  "sideEffects": "основные побочные эффекты",
  "dangerousInteractions": [
    {
      "medicineName": "название препарата",
      "severity": "critical" | "high" | "medium" | "low",
      "description": "описание опасного взаимодействия"
    }
  ]
}

ВАЖНО:
- Для противопоказаний по состояниям укажи "разрешено", "запрещено" или "с осторожностью" с кратким объяснением
- Для dangerousInteractions укажи только КРИТИЧЕСКИЕ и ВЫСОКИЕ взаимодействия (severity: "critical" или "high")
- Для forbiddenFoodsDetailed укажи ВСЕ запрещенные продукты с детальным описанием причин и последствий
- Для foodInteractions укажи ВСЕ категории продуктов, которые могут взаимодействовать с лекарством (молочные, цитрусовые, жирная пища, продукты с железом, грейпфрут, алкоголь, кофеин и т.д.)
- Укажи конкретные продукты в каждой категории
- Если информации нет, верни пустые массивы и "не указано" для строк
- Только JSON, без Markdown.`
      : `Provide complete information about proper medication intake for "${medicineName}".

Return STRICTLY JSON:
{
  "incompatibleMedicines": ["name1", "name2"],
  "compatibleMedicines": [
    {
      "medicineName": "name",
      "instructions": "how to take together",
      "timeInterval": "interval between doses"
    }
  ],
  "forbiddenFoods": ["food1", "food2"],
  "forbiddenFoodsDetailed": [
    {
      "food": "food name",
      "reason": "reason for prohibition",
      "severity": "critical" | "high" | "medium",
      "consequences": "consequences of intake"
    }
  ],
  "recommendedFoods": ["food1", "food2"],
  "foodInteractions": [
    {
      "foodCategory": "category (dairy, citrus, fatty foods, etc.)",
      "foods": ["specific foods"],
      "interaction": "interaction description",
      "severity": "critical" | "high" | "medium" | "low",
      "recommendation": "intake recommendation"
    }
  ],
  "alcoholInteraction": "alcohol interaction description",
  "caffeineInteraction": "caffeine/tea interaction description",
  "grapefruitInteraction": "grapefruit interaction (if any)",
  "dairyInteraction": "dairy products interaction (if any)",
  "ironRichFoodsInteraction": "iron-rich foods interaction (if any)",
  "contraindications": "general contraindications description",
  "contraindicationsByCondition": {
    "pregnancy": "can be taken during pregnancy, risks, trimester",
    "hypertension": "can be taken with hypertension, effect on blood pressure",
    "asthma": "can be taken with asthma, effect on breathing",
    "diabetes": "can be taken with diabetes, effect on blood sugar",
    "kidneyDisease": "can be taken with kidney disease",
    "liverDisease": "can be taken with liver disease",
    "heartDisease": "can be taken with heart disease"
  },
  "sideEffects": "main side effects",
  "dangerousInteractions": [
    {
      "medicineName": "medicine name",
      "severity": "critical" | "high" | "medium" | "low",
      "description": "dangerous interaction description"
    }
  ]
}

IMPORTANT:
- For contraindications by condition, specify "allowed", "forbidden" or "with caution" with brief explanation
- For dangerousInteractions, include only CRITICAL and HIGH interactions (severity: "critical" or "high")
- For forbiddenFoodsDetailed, include ALL forbidden foods with detailed reasons and consequences
- For foodInteractions, include ALL food categories that may interact with the medicine (dairy, citrus, fatty foods, iron-rich foods, grapefruit, alcohol, caffeine, etc.)
- Specify specific foods in each category
- If no information available, return empty arrays and "not specified" for strings
- Only JSON, no Markdown.`;

    const result = await callGeminiAPI({ prompt });

    if (result.error) {
      console.error("Ошибка при получении информации о совместимости:", result.error);
      return {};
    }

    const raw = result.text;

    let cleaned = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      return {};
    }

    cleaned = match[0];
    const parsed = JSON.parse(cleaned);

    return {
      incompatibleMedicines: parsed.incompatibleMedicines || [],
      compatibleMedicines: parsed.compatibleMedicines || [],
      forbiddenFoods: parsed.forbiddenFoods || [],
      forbiddenFoodsDetailed: parsed.forbiddenFoodsDetailed || [],
      recommendedFoods: parsed.recommendedFoods || [],
      foodInteractions: parsed.foodInteractions || [],
      alcoholInteraction: parsed.alcoholInteraction || "не указано",
      caffeineInteraction: parsed.caffeineInteraction || "не указано",
      grapefruitInteraction: parsed.grapefruitInteraction || null,
      dairyInteraction: parsed.dairyInteraction || null,
      ironRichFoodsInteraction: parsed.ironRichFoodsInteraction || null,
      contraindications: parsed.contraindications || null,
      contraindicationsByCondition: parsed.contraindicationsByCondition || {},
      sideEffects: parsed.sideEffects || null,
      dangerousInteractions: parsed.dangerousInteractions || [],
    };
  } catch (error) {
    console.error("Error getting medicine compatibility info:", error);
    return {};
  }
}

/**
 * Интерфейс для медицинских состояний пользователя (устаревший, используется для обратной совместимости)
 */
export interface UserMedicalConditions {
  pregnancy?: boolean; // Беременность
  hypertension?: boolean; // Гипертония
  asthma?: boolean; // Астма
  diabetes?: boolean; // Диабет
  kidneyDisease?: boolean; // Заболевания почек
  liverDisease?: boolean; // Заболевания печени
  heartDisease?: boolean; // Заболевания сердца
  [key: string]: boolean | undefined; // Другие состояния
}

/**
 * Результат проверки противопоказаний
 */
export interface ContraindicationCheckResult {
  hasContraindications: boolean;
  severity: "critical" | "high" | "medium" | "low" | "none";
  warnings: {
    condition: string;
    message: string;
    severity: "critical" | "high" | "medium" | "low";
  }[];
}

/**
 * Преобразует новые поля профиля пользователя в формат для проверки противопоказаний
 */
function normalizeUserConditions(user: any): Record<string, boolean> {
  const conditions: Record<string, boolean> = {};
  
  if (!user) return conditions;
  
  // Получаем все медицинские условия из новых полей
  const medicalConditions = getUserMedicalConditions(user);
  const organConditions = getUserOrganConditions(user);
  
  // Нормализуем названия состояний для сопоставления с contraindicationsByCondition
  const conditionMapping: Record<string, string[]> = {
    pregnancy: ["беременность", "pregnancy", "беременна"],
    hypertension: ["гипертония", "hypertension", "высокое давление", "повышенное давление"],
    asthma: ["астма", "asthma"],
    diabetes: ["диабет", "diabetes", "сахарный диабет"],
    kidneyDisease: ["почки", "kidney", "почечная", "почечная недостаточность", "заболевания почек"],
    liverDisease: ["печень", "liver", "печеночная", "печеночная недостаточность", "заболевания печени"],
    heartDisease: ["сердце", "heart", "сердечная", "сердечная недостаточность", "заболевания сердца"],
  };
  
  // Проверяем медицинские условия
  for (const condition of medicalConditions) {
    const conditionLower = condition.toLowerCase();
    for (const [key, variants] of Object.entries(conditionMapping)) {
      if (variants.some(v => conditionLower.includes(v))) {
        conditions[key] = true;
        break;
      }
    }
  }
  
  // Проверяем состояния органов
  for (const condition of organConditions) {
    const conditionLower = condition.toLowerCase();
    if (conditionLower.includes("почк") || conditionLower.includes("kidney")) {
      conditions.kidneyDisease = true;
    }
    if (conditionLower.includes("печен") || conditionLower.includes("liver")) {
      conditions.liverDisease = true;
    }
    if (conditionLower.includes("сердц") || conditionLower.includes("heart")) {
      conditions.heartDisease = true;
    }
  }
  
  return conditions;
}

/**
 * Проверяет противопоказания лекарства на основе медицинских состояний пользователя
 * Поддерживает как старый формат (UserMedicalConditions), так и новый (объект пользователя)
 */
export function checkContraindications(
  medicineInfo: Partial<MedicineCompatibilityInfo>,
  userConditions?: UserMedicalConditions | any
): ContraindicationCheckResult {
  const warnings: {
    condition: string;
    message: string;
    severity: "critical" | "high" | "medium" | "low";
  }[] = [];

  if (!medicineInfo.contraindicationsByCondition) {
    return {
      hasContraindications: false,
      severity: "none",
      warnings: [],
    };
  }

  // Если передан объект пользователя (новый формат), нормализуем его
  let normalizedConditions: Record<string, boolean> = {};
  if (userConditions) {
    // Проверяем, это старый формат (UserMedicalConditions) или новый (объект пользователя)
    if (typeof userConditions === 'object' && !Array.isArray(userConditions)) {
      // Если есть поля medicalConditions или chronicDiseases, это новый формат
      if (userConditions.medicalConditions || userConditions.chronicDiseases || userConditions.organConditions) {
        normalizedConditions = normalizeUserConditions(userConditions);
      } else {
        // Старый формат (UserMedicalConditions)
        normalizedConditions = userConditions as Record<string, boolean>;
      }
    }
  }

  if (Object.keys(normalizedConditions).length === 0) {
    return {
      hasContraindications: false,
      severity: "none",
      warnings: [],
    };
  }

  const conditionNames: Record<string, string> = {
    pregnancy: "Беременность",
    hypertension: "Гипертония",
    asthma: "Астма",
    diabetes: "Диабет",
    kidneyDisease: "Заболевания почек",
    liverDisease: "Заболевания печени",
    heartDisease: "Заболевания сердца",
  };

  // Проверяем каждое состояние пользователя
  for (const [condition, hasCondition] of Object.entries(normalizedConditions)) {
    if (!hasCondition) continue;

    const contraindication = medicineInfo.contraindicationsByCondition[condition];
    if (!contraindication) continue;

    const contraindicationLower = contraindication.toLowerCase();
    let severity: "critical" | "high" | "medium" | "low" = "medium";

    // Определяем уровень опасности на основе текста
    if (
      contraindicationLower.includes("запрещено") ||
      contraindicationLower.includes("противопоказано") ||
      contraindicationLower.includes("нельзя") ||
      contraindicationLower.includes("forbidden") ||
      contraindicationLower.includes("contraindicated") ||
      contraindicationLower.includes("not allowed")
    ) {
      severity = "critical";
    } else if (
      contraindicationLower.includes("осторожно") ||
      contraindicationLower.includes("с осторожностью") ||
      contraindicationLower.includes("caution") ||
      contraindicationLower.includes("with caution")
    ) {
      severity = "high";
    } else if (
      contraindicationLower.includes("разрешено") ||
      contraindicationLower.includes("можно") ||
      contraindicationLower.includes("allowed") ||
      contraindicationLower.includes("safe")
    ) {
      // Если разрешено, пропускаем
      continue;
    }

    warnings.push({
      condition: conditionNames[condition] || condition,
      message: contraindication,
      severity,
    });
  }

  // Определяем общий уровень опасности
  let overallSeverity: "critical" | "high" | "medium" | "low" | "none" = "none";
  if (warnings.some((w) => w.severity === "critical")) {
    overallSeverity = "critical";
  } else if (warnings.some((w) => w.severity === "high")) {
    overallSeverity = "high";
  } else if (warnings.some((w) => w.severity === "medium")) {
    overallSeverity = "medium";
  } else if (warnings.length > 0) {
    overallSeverity = "low";
  }

  return {
    hasContraindications: warnings.length > 0,
    severity: overallSeverity,
    warnings,
  };
}

/**
 * Проверяет опасные взаимодействия лекарства с другими препаратами
 */
export function checkDangerousInteractions(
  medicineInfo: Partial<MedicineCompatibilityInfo>,
  existingMedicines: { name: string }[]
): {
  medicineName: string;
  severity: "critical" | "high";
  description: string;
}[] {
  const dangerousInteractions: {
    medicineName: string;
    severity: "critical" | "high";
    description: string;
  }[] = [];

  if (!medicineInfo.dangerousInteractions || existingMedicines.length === 0) {
    return dangerousInteractions;
  }

  // Проверяем каждое опасное взаимодействие
  for (const interaction of medicineInfo.dangerousInteractions) {
    if (interaction.severity !== "critical" && interaction.severity !== "high") {
      continue;
    }

    // Ищем совпадение с существующими лекарствами
    for (const existingMed of existingMedicines) {
      const existingName = existingMed.name?.toLowerCase().trim() || "";
      const interactionName = interaction.medicineName?.toLowerCase().trim() || "";

      if (
        existingName.includes(interactionName) ||
        interactionName.includes(existingName)
      ) {
        dangerousInteractions.push({
          medicineName: existingMed.name,
          severity: interaction.severity,
          description: interaction.description,
        });
      }
    }
  }

  return dangerousInteractions;
}

