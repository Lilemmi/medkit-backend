/**
 * Сервис для работы с Gemini API с автоматической ротацией ключей
 */

import { getCurrentApiKey, switchToNextKey, resetKeyIndex, getCurrentKeyIndex, GEMINI_API_KEYS } from "../config/gemini";

interface GeminiRequestOptions {
  prompt: string;
  imageBase64?: string;
  mimeType?: string;
  maxRetries?: number;
}

interface GeminiResponse {
  text: string;
  error?: {
    code: number;
    message: string;
    status?: string;
  };
}

/**
 * Выполняет запрос к Gemini API с автоматической ротацией ключей при ошибке 429
 */
export async function callGeminiAPI({
  prompt,
  imageBase64,
  mimeType = "image/jpeg",
  maxRetries = GEMINI_API_KEYS.length,
}: GeminiRequestOptions): Promise<GeminiResponse> {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
  
  let lastError: any = null;
  let attempts = 0;

  while (attempts < maxRetries) {
    const currentKey = getCurrentApiKey();
    const requestUrl = `${url}?key=${currentKey}`;

    const parts: any[] = [{ text: prompt }];
    
    if (imageBase64) {
      parts.push({
        inlineData: {
          data: imageBase64,
          mimeType,
        },
      });
    }

    const payload = {
      contents: [
        {
          role: "user",
          parts,
        },
      ],
    };

    try {
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      console.log(`📌 Gemini API ответ (ключ #${getCurrentKeyIndex() + 1}/${GEMINI_API_KEYS.length}):`, json);

      // Проверяем наличие ошибки в ответе
      if (json?.error) {
        const error = json.error;
        
        // Если это ошибка превышения квоты (429), пробуем следующий ключ
        if (error.code === 429 || error.status === "RESOURCE_EXHAUSTED") {
          console.log(`⚠️ Ключ #${getCurrentKeyIndex() + 1}/${GEMINI_API_KEYS.length} исчерпан, пробуем следующий...`);
          
          // Переключаемся на следующий ключ (циклически)
          switchToNextKey();
          
          // Пытаемся извлечь время ожидания из сообщения об ошибке
          const retryAfterMatch = error.message?.match(/retry in ([\d.]+)s/i);
          const retryAfter = retryAfterMatch ? Math.ceil(parseFloat(retryAfterMatch[1])) : 60;
          
          // Если все ключи были проверены (количество попыток >= количеству ключей), возвращаем ошибку
          if (attempts >= GEMINI_API_KEYS.length) {
            return {
              text: "",
              error: {
                code: 429,
                message: `Все API ключи исчерпаны. Пожалуйста, попробуйте через ${retryAfter} секунд.`,
                status: "RESOURCE_EXHAUSTED",
              },
            };
          }
          
          // Добавляем небольшую задержку перед следующей попыткой
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Увеличиваем счетчик попыток и повторяем запрос
          attempts++;
          lastError = error;
          continue;
        }
        
        // Если это ошибка перегрузки сервера (503), пробуем с задержкой
        if (error.code === 503 || error.status === "UNAVAILABLE") {
          console.log(`⚠️ Модель перегружена (ключ #${getCurrentKeyIndex() + 1}), пробуем следующий ключ...`);
          
          // Переключаемся на следующий ключ (циклически)
          switchToNextKey();
          
          // Если все ключи были проверены, возвращаем ошибку
          if (attempts >= GEMINI_API_KEYS.length) {
            return {
              text: "",
              error: {
                code: 503,
                message: "Сервис временно недоступен. Пожалуйста, попробуйте через несколько секунд.",
                status: "UNAVAILABLE",
              },
            };
          }
          
          // Добавляем задержку перед следующей попыткой (2-3 секунды)
          await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
          
          attempts++;
          lastError = error;
          continue;
        }
        
        // Другая ошибка - возвращаем её
        return {
          text: "",
          error: {
            code: error.code || 500,
            message: error.message || "Ошибка API",
            status: error.status,
          },
        };
      }

      // Успешный ответ
      const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      
      // Не сбрасываем индекс ключа - продолжаем использовать следующий ключ для следующих запросов
      // Это позволяет равномерно распределять нагрузку между всеми ключами
      
      return { text: raw };
    } catch (error: any) {
      console.error(`❌ Ошибка при запросе к Gemini API (ключ #${getCurrentKeyIndex() + 1}):`, error);
      lastError = error;
      
      // Если это ошибка сети, не переключаем ключ, просто пробуем еще раз
      if (error.message?.includes("network") || error.message?.includes("fetch")) {
        attempts++;
        continue;
      }
      
      // Для других ошибок пробуем следующий ключ (циклически)
      switchToNextKey();
      
      // Если все ключи были проверены, возвращаем ошибку
      if (attempts >= GEMINI_API_KEYS.length) {
        return {
          text: "",
          error: {
            code: 500,
            message: error.message || "Ошибка сети",
          },
        };
      }
      
      attempts++;
    }
  }

  // Если все попытки исчерпаны
  return {
    text: "",
    error: {
      code: 429,
      message: lastError?.message || "Не удалось выполнить запрос после всех попыток",
      status: "RESOURCE_EXHAUSTED",
    },
  };
}


