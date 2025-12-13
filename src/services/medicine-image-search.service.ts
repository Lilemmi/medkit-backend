import { callGeminiAPI } from "./gemini-api.service";

/**
 * Поиск URL изображения лекарства в интернете
 * Использует Gemini API для поиска изображения по названию лекарства
 */
export async function searchMedicineImageUrl(
  medicineName: string,
  language: string = "ru"
): Promise<string | null> {
  if (!medicineName || medicineName.trim() === "") {
    return null;
  }

  try {
    const prompt = language === "ru"
      ? `Найди URL изображения упаковки лекарства "${medicineName}" в интернете. 
Верни ТОЛЬКО URL изображения (https://...) или null, если не найдено.
Примеры правильных URL:
- https://example.com/medicine-image.jpg
- https://pharmacy.com/drugs/panadol.jpg

Верни ТОЛЬКО URL или null. Без текста. Без объяснений.`
      : language === "en"
      ? `Find the URL of the medicine packaging image "${medicineName}" on the internet.
Return ONLY the image URL (https://...) or null if not found.
Examples of correct URLs:
- https://example.com/medicine-image.jpg
- https://pharmacy.com/drugs/panadol.jpg

Return ONLY URL or null. No text. No explanations.`
      : `מצא את כתובת ה-URL של תמונת אריזת התרופה "${medicineName}" באינטרנט.
החזר רק את כתובת ה-URL (https://...) או null אם לא נמצא.
דוגמאות לכתובות נכונות:
- https://example.com/medicine-image.jpg
- https://pharmacy.com/drugs/panadol.jpg

החזר רק URL או null. ללא טקסט. ללא הסברים.`;

    const result = await callGeminiAPI({
      prompt,
      imageBase64: undefined,
      mimeType: undefined,
    });

    if (result.error) {
      console.log("⚠️ Ошибка при поиске изображения:", result.error);
      return null;
    }

    const text = result.text?.trim() || "";
    
    // Проверяем, является ли результат URL
    if (text.startsWith("http://") || text.startsWith("https://")) {
      // Очищаем от возможных кавычек и пробелов
      const cleanUrl = text.replace(/['"]/g, "").trim();
      return cleanUrl;
    }

    // Если результат "null" или пустой, возвращаем null
    if (text.toLowerCase() === "null" || text === "") {
      return null;
    }

    // Пытаемся извлечь URL из текста
    const urlMatch = text.match(/https?:\/\/[^\s"']+/);
    if (urlMatch) {
      return urlMatch[0];
    }

    return null;
  } catch (error) {
    console.error("❌ Ошибка при поиске изображения лекарства:", error);
    return null;
  }
}

/**
 * Генерирует URL изображения через Google Image Search API (альтернативный метод)
 * Требует настройки Google Custom Search API
 */
export function generateGoogleImageSearchUrl(medicineName: string): string {
  // Это пример URL для Google Custom Search API
  // В реальном приложении нужно настроить API ключ и Search Engine ID
  const encodedName = encodeURIComponent(medicineName);
  // Пример: https://www.googleapis.com/customsearch/v1?key=YOUR_API_KEY&cx=YOUR_SEARCH_ENGINE_ID&q=${encodedName}&searchType=image
  return `https://www.google.com/search?q=${encodedName}+medicine+packaging&tbm=isch`;
}







