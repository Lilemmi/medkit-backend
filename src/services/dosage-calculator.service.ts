// 📌 Сервис для расчета дозировки лекарств на основе характеристик пользователя

interface UserCharacteristics {
  birthDate?: string | null; // YYYY-MM-DD
  weight?: number | null; // кг
  height?: number | null; // см
  gender?: string | null; // "male", "female", "other"
  chronicDiseases?: string[] | null;
  medicalConditions?: string[] | null;
  organConditions?: string[] | null;
}

interface DosageCalculationResult {
  recommendedDosage: string;
  calculationDetails: string[];
  warnings: string[];
}

/**
 * Рассчитать возраст пользователя в годах
 */
function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  
  try {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  } catch {
    return null;
  }
}

/**
 * Рассчитать ИМТ (индекс массы тела)
 */
function calculateBMI(weight: number | null, height: number | null): number | null {
  if (!weight || !height || height === 0) return null;
  
  // Рост в метрах
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  
  return Math.round(bmi * 10) / 10;
}

/**
 * Рассчитать дозировку на основе стандартной дозы и характеристик пользователя
 */
export function calculateDosageForUser(
  standardDose: string | null | undefined,
  medicineName: string,
  userCharacteristics: UserCharacteristics
): DosageCalculationResult {
  const details: string[] = [];
  const warnings: string[] = [];
  
  // Если стандартная доза не указана, возвращаем базовую рекомендацию
  if (!standardDose || standardDose.trim() === "" || standardDose === "—" || standardDose === "-") {
    return {
      recommendedDosage: "Требуется консультация врача",
      calculationDetails: ["Стандартная дозировка не указана"],
      warnings: ["Необходимо проконсультироваться с врачом для определения правильной дозировки"]
    };
  }

  const age = calculateAge(userCharacteristics.birthDate);
  const bmi = calculateBMI(userCharacteristics.weight ?? null, userCharacteristics.height ?? null);
  
  let recommendedDosage = standardDose;
  let adjustmentFactor = 1.0;
  
  // Корректировка по возрасту
  if (age !== null) {
    if (age < 12) {
      // Дети до 12 лет - снижение дозы
      const childFactor = age < 6 ? 0.3 : age < 9 ? 0.5 : 0.7;
      adjustmentFactor *= childFactor;
      details.push(`Возраст ${age} лет: доза снижена до ${Math.round(childFactor * 100)}%`);
      warnings.push(`⚠️ Для детей требуется особая осторожность. Проконсультируйтесь с педиатром.`);
    } else if (age >= 65) {
      // Пожилые люди - снижение дозы
      adjustmentFactor *= 0.8;
      details.push(`Возраст ${age} лет: доза снижена до 80%`);
      warnings.push(`⚠️ Для пожилых людей может потребоваться корректировка дозы.`);
    } else {
      details.push(`Возраст ${age} лет: стандартная доза`);
    }
  }
  
  // Корректировка по весу (для некоторых препаратов)
  if (userCharacteristics.weight && bmi !== null) {
    if (bmi < 18.5) {
      // Недостаточный вес
      adjustmentFactor *= 0.9;
      details.push(`ИМТ ${bmi} (недостаточный вес): доза снижена до 90%`);
    } else if (bmi > 30) {
      // Ожирение - может потребоваться увеличение дозы для некоторых препаратов
      details.push(`ИМТ ${bmi} (ожирение): может потребоваться корректировка дозы`);
      warnings.push(`⚠️ При ожирении некоторые препараты требуют корректировки дозы.`);
    } else {
      details.push(`ИМТ ${bmi} (нормальный вес): стандартная доза`);
    }
  }
  
  // Корректировка по состоянию органов
  if (userCharacteristics.organConditions && userCharacteristics.organConditions.length > 0) {
    const hasLiverIssues = userCharacteristics.organConditions.some(condition => 
      condition.toLowerCase().includes("печень") || 
      condition.toLowerCase().includes("liver") ||
      condition.toLowerCase().includes("гепатит") ||
      condition.toLowerCase().includes("hepatitis")
    );
    
    const hasKidneyIssues = userCharacteristics.organConditions.some(condition => 
      condition.toLowerCase().includes("почки") || 
      condition.toLowerCase().includes("kidney") ||
      condition.toLowerCase().includes("почечная") ||
      condition.toLowerCase().includes("renal")
    );
    
    if (hasLiverIssues) {
      adjustmentFactor *= 0.7;
      details.push(`Проблемы с печенью: доза снижена до 70%`);
      warnings.push(`🚨 При проблемах с печенью доза должна быть снижена. Обязательно проконсультируйтесь с врачом!`);
    }
    
    if (hasKidneyIssues) {
      adjustmentFactor *= 0.75;
      details.push(`Проблемы с почками: доза снижена до 75%`);
      warnings.push(`🚨 При проблемах с почками доза должна быть снижена. Обязательно проконсультируйтесь с врачом!`);
    }
  }
  
  // Корректировка по хроническим заболеваниям
  if (userCharacteristics.chronicDiseases && userCharacteristics.chronicDiseases.length > 0) {
    const hasDiabetes = userCharacteristics.chronicDiseases.some(disease => 
      disease.toLowerCase().includes("диабет") || 
      disease.toLowerCase().includes("diabetes")
    );
    
    if (hasDiabetes) {
      details.push(`Диабет: требуется особая осторожность`);
      warnings.push(`⚠️ При диабете некоторые препараты требуют особой осторожности.`);
    }
  }
  
  // Корректировка по особым состояниям
  if (userCharacteristics.medicalConditions && userCharacteristics.medicalConditions.length > 0) {
    const isPregnant = userCharacteristics.medicalConditions.some(condition => 
      condition.toLowerCase().includes("беременность") || 
      condition.toLowerCase().includes("pregnancy")
    );
    
    if (isPregnant) {
      adjustmentFactor *= 0.8;
      details.push(`Беременность: доза снижена до 80%`);
      warnings.push(`🚨 При беременности многие препараты противопоказаны или требуют снижения дозы. Обязательно проконсультируйтесь с врачом!`);
    }
  }
  
  // Применяем коэффициент корректировки к дозе
  // Пытаемся извлечь числовое значение из стандартной дозы
  const doseMatch = standardDose.match(/(\d+(?:\.\d+)?)\s*(мг|mg|г|g|мл|ml|таблетк|табл|капсул|капс)/i);
  
  if (doseMatch && adjustmentFactor !== 1.0) {
    const baseValue = parseFloat(doseMatch[1]);
    const unit = doseMatch[2];
    const adjustedValue = Math.round(baseValue * adjustmentFactor * 10) / 10;
    recommendedDosage = `${adjustedValue} ${unit}`;
    details.push(`Скорректированная доза: ${recommendedDosage} (коэффициент ${Math.round(adjustmentFactor * 100)}%)`);
  } else if (adjustmentFactor !== 1.0) {
    // Если не удалось извлечь числовое значение, добавляем предупреждение
    warnings.push(`⚠️ Рекомендуется проконсультироваться с врачом для корректировки дозы (коэффициент ${Math.round(adjustmentFactor * 100)}%)`);
  }
  
  // Добавляем общее предупреждение
  if (warnings.length === 0 && adjustmentFactor !== 1.0) {
    warnings.push(`⚠️ Доза скорректирована на основе ваших характеристик. При появлении побочных эффектов обратитесь к врачу.`);
  }
  
  return {
    recommendedDosage,
    calculationDetails: details,
    warnings: warnings.length > 0 ? warnings : []
  };
}

/**
 * Получить дозировку для пользователя с учетом всех характеристик
 */
export async function getDosageForUser(
  medicineName: string,
  standardDose: string | null | undefined,
  userId: number,
  familyMemberId?: number | null
): Promise<DosageCalculationResult> {
  // TODO: Загрузить характеристики пользователя или члена семьи из базы данных
  // Пока возвращаем базовый расчет
  
  const userCharacteristics: UserCharacteristics = {
    birthDate: null,
    weight: null,
    height: null,
    gender: null,
    chronicDiseases: null,
    medicalConditions: null,
    organConditions: null,
  };
  
  return calculateDosageForUser(standardDose, medicineName, userCharacteristics);
}





