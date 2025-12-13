/**
 * Сервис для получения текущей температуры
 * Использует API погоды для определения температуры в помещении
 */

interface TemperatureResult {
  temperature: number; // температура в градусах Цельсия
  source: "weather_api" | "sensor" | "manual";
  error?: string;
}

/**
 * Получает текущую температуру через API погоды
 * Использует OpenWeatherMap API (бесплатный план)
 */
export async function getCurrentTemperature(): Promise<TemperatureResult> {
  try {
    // Получаем координаты пользователя (можно использовать геолокацию или задать вручную)
    // Для упрощения используем API погоды по IP или координатам
    
    // ВАЖНО: Для работы нужно получить API ключ на https://openweathermap.org/api
    // Можно также использовать другие бесплатные API: WeatherAPI, Open-Meteo и т.д.
    
    // Пример с OpenWeatherMap (нужен API ключ)
    // const API_KEY = "YOUR_API_KEY"; // Получить на https://openweathermap.org/api
    // const response = await fetch(
    //   `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    // );
    
    // Временное решение: используем Open-Meteo (не требует API ключа)
    // Получаем примерную температуру по IP или используем дефолтное значение
    const response = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=50.45&longitude=30.52&current=temperature_2m&timezone=auto"
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch temperature");
    }
    
    const data = await response.json();
    const temperature = data.current?.temperature_2m || null;
    
    if (temperature === null) {
      return {
        temperature: 20, // Дефолтное значение, если не удалось получить
        source: "manual",
        error: "Не удалось получить температуру, используется значение по умолчанию: 20°C"
      };
    }
    
    return {
      temperature: Math.round(temperature),
      source: "weather_api"
    };
  } catch (error: any) {
    console.error("❌ Ошибка получения температуры:", error);
    
    // Возвращаем дефолтное значение при ошибке
    return {
      temperature: 20, // Средняя комнатная температура
      source: "manual",
      error: error.message || "Не удалось получить температуру"
    };
  }
}

/**
 * Парсит условия хранения из строки
 * Примеры: "<25°C", "2-8°C", "не выше 25°C", "хранить в холодильнике"
 */
export function parseStorageTemperature(storageConditions: string | null): {
  maxTemp: number | null;
  minTemp: number | null;
  requiresRefrigerator: boolean;
} {
  if (!storageConditions) {
    return { maxTemp: null, minTemp: null, requiresRefrigerator: false };
  }
  
  const conditions = storageConditions.toLowerCase();
  let maxTemp: number | null = null;
  let minTemp: number | null = null;
  let requiresRefrigerator = false;
  
  // Проверка на холодильник
  if (conditions.includes("холодильник") || 
      conditions.includes("refrigerator") || 
      conditions.includes("2-8") ||
      conditions.includes("2°c-8°c")) {
    requiresRefrigerator = true;
    minTemp = 2;
    maxTemp = 8;
    return { maxTemp, minTemp, requiresRefrigerator };
  }
  
  // Парсинг диапазона температур (например, "15-25°C")
  const rangeMatch = conditions.match(/(\d+)\s*[-–]\s*(\d+)\s*°?c/);
  if (rangeMatch) {
    minTemp = parseInt(rangeMatch[1]);
    maxTemp = parseInt(rangeMatch[2]);
    return { maxTemp, minTemp, requiresRefrigerator };
  }
  
  // Парсинг "не выше X°C" или "<X°C" или "до X°C"
  const maxMatch = conditions.match(/(?:не\s+выше|до|максимум|max|<\s*|≤\s*)(\d+)\s*°?c/i);
  if (maxMatch) {
    maxTemp = parseInt(maxMatch[1]);
    return { maxTemp, minTemp, requiresRefrigerator };
  }
  
  // Парсинг "выше X°C" или ">X°C" или "минимум X°C"
  const minMatch = conditions.match(/(?:не\s+ниже|минимум|min|>\s*|≥\s*)(\d+)\s*°?c/i);
  if (minMatch) {
    minTemp = parseInt(minMatch[1]);
    return { maxTemp, minTemp, requiresRefrigerator };
  }
  
  // Парсинг простого числа (например, "25°C" - считается максимальной температурой)
  const simpleMatch = conditions.match(/(\d+)\s*°?c/i);
  if (simpleMatch) {
    maxTemp = parseInt(simpleMatch[1]);
    return { maxTemp, minTemp, requiresRefrigerator };
  }
  
  return { maxTemp, minTemp, requiresRefrigerator };
}

/**
 * Проверяет, соответствует ли текущая температура условиям хранения
 */
export function checkStorageTemperature(
  currentTemp: number,
  storageConditions: string | null
): {
  isSafe: boolean;
  warning: string | null;
  requiresRefrigerator: boolean;
} {
  if (!storageConditions) {
    return { isSafe: true, warning: null, requiresRefrigerator: false };
  }
  
  const { maxTemp, minTemp, requiresRefrigerator } = parseStorageTemperature(storageConditions);
  
  // Если требуется холодильник, но температура выше 8°C
  if (requiresRefrigerator && currentTemp > 8) {
    return {
      isSafe: false,
      warning: `Лекарство должно храниться в холодильнике (2-8°C), но текущая температура ${currentTemp}°C. Лекарство может испортиться.`,
      requiresRefrigerator: true
    };
  }
  
  // Проверка максимальной температуры
  if (maxTemp !== null && currentTemp > maxTemp) {
    return {
      isSafe: false,
      warning: `Температура в помещении ${currentTemp}°C. Лекарство должно храниться при температуре не выше ${maxTemp}°C и может испортиться.`,
      requiresRefrigerator: false
    };
  }
  
  // Проверка минимальной температуры (если указана отдельно от холодильника)
  if (minTemp !== null && !requiresRefrigerator && currentTemp < minTemp) {
    return {
      isSafe: false,
      warning: `Температура в помещении ${currentTemp}°C. Лекарство должно храниться при температуре не ниже ${minTemp}°C.`,
      requiresRefrigerator: false
    };
  }
  
  return { isSafe: true, warning: null, requiresRefrigerator };
}

