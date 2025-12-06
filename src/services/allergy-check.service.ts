import { getMedicineIngredients, MedicineIngredients } from "./medicine-api.service";
import { getAllFamilyMembers } from "./family.service";

export type AllergySeverity = "critical" | "medium" | "none";

export interface AllergyMatch {
  substance: string; // Название вещества
  memberName: string; // Имя члена семьи с аллергией
  severity: AllergySeverity; // Уровень опасности
}

export interface AllergyCheckResult {
  hasAllergies: boolean;
  severity: AllergySeverity;
  matches: AllergyMatch[];
  allIngredients: string[]; // Все вещества в лекарстве
}

/**
 * Проверить лекарство на аллергии всех членов семьи
 * @param medicineName - Название лекарства
 * @param userId - ID текущего пользователя
 * @param userAllergies - Аллергии текущего пользователя (опционально)
 * @param userName - Имя текущего пользователя (опционально)
 * @returns Результат проверки аллергий
 */
export async function checkMedicineAllergies(
  medicineName: string,
  userId: number,
  userAllergies?: string,
  userName?: string
): Promise<AllergyCheckResult> {
  try {
    // 1. Получаем состав лекарства
    const ingredients = await getMedicineIngredients(medicineName);
    
    // 2. Получаем всех членов семьи
    const familyMembers = await getAllFamilyMembers();
    
    // 3. Создаем список всех людей для проверки (включая текущего пользователя)
    const allPeople = [
      ...familyMembers,
      userAllergies && userName
        ? { id: userId, name: userName, allergies: userAllergies }
        : null,
    ].filter(Boolean) as Array<{ id: number; name: string; allergies: string }>;
    
    // 4. Собираем все вещества из лекарства
    const allSubstances = [
      ...ingredients.activeIngredients,
      ...(ingredients.inactiveIngredients || []),
    ].map(s => s.toLowerCase().trim());
    
    // 5. Проверяем каждое вещество на совпадение с аллергиями
    const matches: AllergyMatch[] = [];
    
    for (const person of allPeople) {
      if (!person.allergies) continue;
      
      // Разбиваем аллергии на список (через запятую)
      const personAllergies = person.allergies
        .split(",")
        .map(a => a.trim().toLowerCase())
        .filter(Boolean);
      
      // Проверяем каждое вещество лекарства
      for (const substance of allSubstances) {
        for (const allergy of personAllergies) {
          // Проверяем точное совпадение или частичное
          if (
            substance === allergy ||
            substance.includes(allergy) ||
            allergy.includes(substance)
          ) {
            // Определяем уровень опасности
            // Критический: если вещество точно совпадает с аллергией
            // Средний: если есть частичное совпадение
            const severity: AllergySeverity = 
              substance === allergy ? "critical" : "medium";
            
            matches.push({
              substance: substance.charAt(0).toUpperCase() + substance.slice(1),
              memberName: person.name,
              severity,
            });
          }
        }
      }
    }
    
    // 6. Определяем общий уровень опасности
    let severity: AllergySeverity = "none";
    if (matches.some(m => m.severity === "critical")) {
      severity = "critical";
    } else if (matches.length > 0) {
      severity = "medium";
    }
    
    return {
      hasAllergies: matches.length > 0,
      severity,
      matches,
      allIngredients: allSubstances.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
    };
  } catch (error) {
    console.error("Error checking allergies:", error);
    return {
      hasAllergies: false,
      severity: "none",
      matches: [],
      allIngredients: [],
    };
  }
}

