import { getAllFamilyMembers } from "./family.service";

export type AllergySeverity = "critical" | "medium" | "none";

export interface AllergyMatch {
  substance: string; // Название вещества
  memberName: string; // Имя члена семьи с аллергией
  severity: AllergySeverity; // Уровень опасности
}

/**
 * Быстрая проверка аллергий по тексту ввода (без API запроса)
 * Проверяет прямое совпадение слов из текста с аллергиями
 * @param inputText - Текст, который вводит пользователь
 * @param userId - ID текущего пользователя
 * @param userAllergies - Аллергии текущего пользователя (опционально)
 * @param userName - Имя текущего пользователя (опционально)
 * @returns Список совпадений аллергий
 */
export async function checkAllergiesInText(
  inputText: string,
  userId: number,
  userAllergies?: string,
  userName?: string
): Promise<AllergyMatch[]> {
  try {
    if (!inputText || inputText.trim().length < 2) {
      return [];
    }

    // 1. Получаем всех членов семьи
    const familyMembers = await getAllFamilyMembers();
    
    // 2. Создаем список всех людей для проверки (включая текущего пользователя)
    const allPeople = [
      ...familyMembers,
      userAllergies && userName
        ? { id: userId, name: userName, allergies: userAllergies }
        : null,
    ].filter(Boolean) as Array<{ id: number; name: string; allergies: string }>;
    
    // 3. Разбиваем введенный текст на слова
    const inputWords = inputText
      .toLowerCase()
      .split(/[\s,\-\.]+/)
      .map(w => w.trim())
      .filter(w => w.length >= 2);
    
    // 4. Проверяем каждое слово на совпадение с аллергиями
    const matches: AllergyMatch[] = [];
    
    for (const person of allPeople) {
      if (!person.allergies) continue;
      
      // Разбиваем аллергии на список (через запятую)
      const personAllergies = person.allergies
        .split(",")
        .map(a => a.trim().toLowerCase())
        .filter(Boolean);
      
      // Проверяем каждое слово из ввода
      for (const word of inputWords) {
        for (const allergy of personAllergies) {
          // Проверяем точное совпадение или частичное
          if (
            word === allergy ||
            word.includes(allergy) ||
            allergy.includes(word)
          ) {
            // Определяем уровень опасности
            // Критический: если слово точно совпадает с аллергией
            // Средний: если есть частичное совпадение
            const severity: AllergySeverity = 
              word === allergy ? "critical" : "medium";
            
            // Проверяем, не добавили ли мы уже это совпадение
            const alreadyExists = matches.some(
              m => m.substance.toLowerCase() === allergy && m.memberName === person.name
            );
            
            if (!alreadyExists) {
              matches.push({
                substance: allergy.charAt(0).toUpperCase() + allergy.slice(1),
                memberName: person.name,
                severity,
              });
            }
          }
        }
      }
    }
    
    return matches;
  } catch (error) {
    console.error("Error checking allergies in text:", error);
    return [];
  }
}




