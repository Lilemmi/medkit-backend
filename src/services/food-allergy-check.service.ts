import { getAllFamilyMembers } from "./family.service";

export interface FoodAllergyMatch {
  food: string; // Название продукта
  memberName: string; // Имя члена семьи с аллергией
  severity: "critical" | "medium" | "low";
  reason?: string; // Причина (аллергия или взаимодействие с лекарством)
}

export interface FoodAllergyCheckResult {
  hasAllergies: boolean;
  severity: "critical" | "medium" | "low" | "none";
  matches: FoodAllergyMatch[];
  warnings: {
    food: string;
    message: string;
    severity: "critical" | "high" | "medium" | "low";
  }[];
}

/**
 * Проверить продукты на аллергии всех членов семьи
 * @param foods - Список продуктов для проверки
 * @param userId - ID текущего пользователя
 * @param userAllergies - Аллергии текущего пользователя (опционально)
 * @param userName - Имя текущего пользователя (опционально)
 * @returns Результат проверки аллергий на продукты
 */
export async function checkFoodAllergies(
  foods: string[],
  userId: number,
  userAllergies?: string,
  userName?: string
): Promise<FoodAllergyCheckResult> {
  const matches: FoodAllergyMatch[] = [];
  const warnings: {
    food: string;
    message: string;
    severity: "critical" | "high" | "medium" | "low";
  }[] = [];

  try {
    // 1. Получаем всех членов семьи
    const familyMembers = await getAllFamilyMembers();

    // 2. Создаем список всех людей для проверки (включая текущего пользователя)
    const allPeople = [
      ...familyMembers,
      userAllergies && userName
        ? { id: userId, name: userName, allergies: userAllergies }
        : null,
    ].filter(Boolean) as { id: number; name: string; allergies: string }[];

    // 3. Проверяем каждый продукт на аллергии
    for (const food of foods) {
      const foodLower = food.toLowerCase().trim();

      for (const person of allPeople) {
        if (!person.allergies) continue;

        // Разбиваем аллергии на список (через запятую)
        const personAllergies = person.allergies
          .split(",")
          .map(a => a.trim().toLowerCase())
          .filter(Boolean);

        // Проверяем каждую аллергию
        for (const allergy of personAllergies) {
          // Проверяем точное совпадение или частичное
          if (
            foodLower === allergy ||
            foodLower.includes(allergy) ||
            allergy.includes(foodLower)
          ) {
            // Определяем уровень опасности
            const severity: "critical" | "medium" | "low" =
              foodLower === allergy ? "critical" : "medium";

            matches.push({
              food: food.charAt(0).toUpperCase() + food.slice(1),
              memberName: person.name,
              severity,
              reason: "аллергия",
            });
          }
        }
      }
    }

    // 4. Определяем общий уровень опасности
    let severity: "critical" | "medium" | "low" | "none" = "none";
    if (matches.some(m => m.severity === "critical")) {
      severity = "critical";
    } else if (matches.some(m => m.severity === "medium")) {
      severity = "medium";
    } else if (matches.length > 0) {
      severity = "low";
    }

    return {
      hasAllergies: matches.length > 0,
      severity,
      matches,
      warnings,
    };
  } catch (error) {
    console.error("Error checking food allergies:", error);
    return {
      hasAllergies: false,
      severity: "none",
      matches: [],
      warnings: [],
    };
  }
}

/**
 * Проверить взаимодействия продуктов с лекарством и аллергии
 * @param medicineInfo - Информация о лекарстве
 * @param userId - ID пользователя
 * @param userAllergies - Аллергии пользователя
 * @param userName - Имя пользователя
 * @returns Результат проверки с предупреждениями
 */
export async function checkFoodMedicineInteractions(
  medicineInfo: {
    forbiddenFoods?: string[];
    forbiddenFoodsDetailed?: {
      food: string;
      reason: string;
      severity: "critical" | "high" | "medium";
      consequences: string;
    }[];
    foodInteractions?: {
      foodCategory: string;
      foods: string[];
      interaction: string;
      severity: "critical" | "high" | "medium" | "low";
      recommendation: string;
    }[];
    alcoholInteraction?: string;
    caffeineInteraction?: string;
    grapefruitInteraction?: string;
    dairyInteraction?: string;
    ironRichFoodsInteraction?: string;
  },
  userId: number,
  userAllergies?: string,
  userName?: string
): Promise<FoodAllergyCheckResult> {
  const matches: FoodAllergyMatch[] = [];
  const warnings: {
    food: string;
    message: string;
    severity: "critical" | "high" | "medium" | "low";
  }[] = [];

  try {
    // Собираем все продукты для проверки
    const allFoods: string[] = [];

    // Добавляем запрещенные продукты
    if (medicineInfo.forbiddenFoods) {
      allFoods.push(...medicineInfo.forbiddenFoods);
    }
    if (medicineInfo.forbiddenFoodsDetailed) {
      allFoods.push(...medicineInfo.forbiddenFoodsDetailed.map(f => f.food));
    }

    // Добавляем продукты из категорий взаимодействий
    if (medicineInfo.foodInteractions) {
      for (const interaction of medicineInfo.foodInteractions) {
        allFoods.push(...interaction.foods);
      }
    }

    // Проверяем аллергии на все продукты
    const allergyCheck = await checkFoodAllergies(allFoods, userId, userAllergies, userName);
    matches.push(...allergyCheck.matches);

    // Добавляем предупреждения о взаимодействиях с лекарством
    if (medicineInfo.forbiddenFoodsDetailed) {
      for (const foodInfo of medicineInfo.forbiddenFoodsDetailed) {
        warnings.push({
          food: foodInfo.food,
          message: `${foodInfo.reason}. ${foodInfo.consequences}`,
          severity: foodInfo.severity === "critical" ? "critical" : foodInfo.severity === "high" ? "high" : "medium",
        });
      }
    }

    // Добавляем предупреждения из категорий взаимодействий
    if (medicineInfo.foodInteractions) {
      for (const interaction of medicineInfo.foodInteractions) {
        if (interaction.severity === "critical" || interaction.severity === "high") {
          for (const food of interaction.foods) {
            warnings.push({
              food,
              message: `${interaction.interaction}. ${interaction.recommendation}`,
              severity: interaction.severity === "critical" ? "critical" : "high",
            });
          }
        }
      }
    }

    // Добавляем специальные взаимодействия
    if (medicineInfo.grapefruitInteraction && medicineInfo.grapefruitInteraction !== "не указано") {
      warnings.push({
        food: "Грейпфрут",
        message: medicineInfo.grapefruitInteraction,
        severity: "high",
      });
    }

    if (medicineInfo.dairyInteraction && medicineInfo.dairyInteraction !== "не указано") {
      warnings.push({
        food: "Молочные продукты",
        message: medicineInfo.dairyInteraction,
        severity: "medium",
      });
    }

    if (medicineInfo.ironRichFoodsInteraction && medicineInfo.ironRichFoodsInteraction !== "не указано") {
      warnings.push({
        food: "Продукты, богатые железом",
        message: medicineInfo.ironRichFoodsInteraction,
        severity: "medium",
      });
    }

    if (medicineInfo.alcoholInteraction && medicineInfo.alcoholInteraction !== "не указано") {
      warnings.push({
        food: "Алкоголь",
        message: medicineInfo.alcoholInteraction,
        severity: "high",
      });
    }

    if (medicineInfo.caffeineInteraction && medicineInfo.caffeineInteraction !== "не указано") {
      warnings.push({
        food: "Кофеин (кофе, чай)",
        message: medicineInfo.caffeineInteraction,
        severity: "medium",
      });
    }

    // Определяем общий уровень опасности
    let severity: "critical" | "medium" | "low" | "none" = "none";
    
    const hasCriticalAllergy = matches.some(m => m.severity === "critical");
    const hasCriticalWarning = warnings.some(w => w.severity === "critical");
    
    if (hasCriticalAllergy || hasCriticalWarning) {
      severity = "critical";
    } else if (matches.some(m => m.severity === "medium") || warnings.some(w => w.severity === "high")) {
      severity = "medium";
    } else if (matches.length > 0 || warnings.length > 0) {
      severity = "low";
    }

    return {
      hasAllergies: matches.length > 0 || warnings.length > 0,
      severity,
      matches,
      warnings,
    };
  } catch (error) {
    console.error("Error checking food-medicine interactions:", error);
    return {
      hasAllergies: false,
      severity: "none",
      matches: [],
      warnings: [],
    };
  }
}







