/**
 * Утилиты для работы с профилем пользователя
 */

/**
 * Вычисляет возраст из даты рождения
 * @param birthDate - Дата рождения в формате Date, string (ISO) или null
 * @returns Возраст в годах или null, если дата не указана
 */
export function calculateAge(birthDate: Date | string | null | undefined): number | null {
  if (!birthDate) return null;
  
  try {
    const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
    if (isNaN(birth.getTime())) return null;
    
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age >= 0 ? age : null;
  } catch (error) {
    console.error("Error calculating age:", error);
    return null;
  }
}

/**
 * Получает медицинские условия пользователя в виде массива строк
 * @param user - Объект пользователя
 * @returns Массив медицинских условий
 */
export function getUserMedicalConditions(user: any): string[] {
  const conditions: string[] = [];
  
  if (user?.medicalConditions) {
    if (Array.isArray(user.medicalConditions)) {
      conditions.push(...user.medicalConditions);
    } else if (typeof user.medicalConditions === 'string') {
      try {
        const parsed = JSON.parse(user.medicalConditions);
        if (Array.isArray(parsed)) {
          conditions.push(...parsed);
        }
      } catch {
        // Если не JSON, считаем строкой с разделителями
        conditions.push(...user.medicalConditions.split(',').map((c: string) => c.trim()).filter(Boolean));
      }
    }
  }
  
  if (user?.chronicDiseases) {
    if (Array.isArray(user.chronicDiseases)) {
      conditions.push(...user.chronicDiseases);
    } else if (typeof user.chronicDiseases === 'string') {
      try {
        const parsed = JSON.parse(user.chronicDiseases);
        if (Array.isArray(parsed)) {
          conditions.push(...parsed);
        }
      } catch {
        conditions.push(...user.chronicDiseases.split(',').map((c: string) => c.trim()).filter(Boolean));
      }
    }
  }
  
  return conditions;
}

/**
 * Получает состояния органов пользователя
 * @param user - Объект пользователя
 * @returns Массив состояний органов
 */
export function getUserOrganConditions(user: any): string[] {
  if (!user?.organConditions) return [];
  
  if (Array.isArray(user.organConditions)) {
    return user.organConditions;
  }
  
  if (typeof user.organConditions === 'string') {
    try {
      const parsed = JSON.parse(user.organConditions);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return user.organConditions.split(',').map((c: string) => c.trim()).filter(Boolean);
    }
  }
  
  return [];
}







