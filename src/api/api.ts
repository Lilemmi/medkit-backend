import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { logError } from "../utils/errorHandler";

// Определяем базовый URL API
// Только Railway URL (продакшен) - локальный сервер больше не используется
const getBaseURL = () => {
  // 1. Проверяем Railway URL из app.json (приоритет)
  const railwayUrl = 
    Constants.expoConfig?.extra?.railwayApiUrl ||
    (Constants.manifest as any)?.extra?.railwayApiUrl;
  
  // Пропускаем placeholder и пустые URL
  if (railwayUrl && 
      railwayUrl.trim() !== "" && 
      !railwayUrl.includes("YOUR-APP-NAME") &&
      (railwayUrl.startsWith("http://") || railwayUrl.startsWith("https://"))) {
    console.log("✅ Using Railway API URL:", railwayUrl);
    return railwayUrl;
  }

  // 2. Проверяем переменную окружения (для кастомной настройки)
  const envUrl = 
    process.env.EXPO_PUBLIC_API_URL || 
    Constants.expoConfig?.extra?.apiUrl ||
    (Constants.manifest as any)?.extra?.apiUrl;
    
  if (envUrl && 
      envUrl.trim() !== "" && 
      (envUrl.startsWith("http://") || envUrl.startsWith("https://"))) {
    console.log("✅ Using API URL from env:", envUrl);
    return envUrl;
  }
  
  // 3. Если Railway URL не настроен - показываем ошибку и используем placeholder
  console.error("❌ Railway API URL not configured!");
  console.error("💡 Добавьте Railway URL в app.json → extra → railwayApiUrl");
  console.error("   Или создайте .env файл с EXPO_PUBLIC_API_URL=https://your-app.railway.app");
  
  // Возвращаем placeholder, чтобы приложение не упало
  // Но все запросы будут падать с понятной ошибкой
  const placeholderUrl = "https://RAILWAY-URL-NOT-CONFIGURED.railway.app";
  console.warn("⚠️ Using placeholder URL - все запросы будут падать!");
  console.warn("⚠️ Настройте Railway URL в app.json!");
  return placeholderUrl;
};

// Получаем базовый URL при инициализации
const baseURL = getBaseURL();
// Логируем только в режиме разработки
if (__DEV__) {
  console.log("🌐 API Base URL initialized:", baseURL);
}

export const api = axios.create({
  baseURL,
  timeout: 15000, // Увеличиваем таймаут
  headers: {
    "Content-Type": "application/json",
  },
});

// Автоматически подставляет токен во все запросы
api.interceptors.request.use(
  async (config) => {
    const token = await import("expo-secure-store").then((m) =>
      m.getItemAsync("token")
    );

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Обработка ошибок ответа
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Ленивый импорт для избежания циклической зависимости
    const { useAuthStore } = await import("../store/authStore");
    const user = useAuthStore.getState().user;
    
    if (error.code === "ECONNABORTED") {
      console.error("⏱️ Request timeout");
      error.message = "Превышено время ожидания. Проверьте подключение к интернету.";
    } else if (error.message === "Network Error" || error.code === "ERR_NETWORK") {
      const baseURL = getBaseURL();
      
      // Логируем только один раз, без подробностей (чтобы не засорять консоль)
      // Детальное логирование только при первой ошибке или в режиме разработки
      if (__DEV__) {
        console.log("🌐 Network Error - нет подключения к серверу");
      }
      
      // Проверяем, не является ли это ошибкой из-за неправильной настройки URL
      if (baseURL.includes("RAILWAY-URL-NOT-CONFIGURED")) {
        error.message = `Railway API URL не настроен!\n\nДобавьте Railway URL в app.json:\n"railwayApiUrl": "https://your-app.railway.app"\n\nИли создайте .env файл:\nEXPO_PUBLIC_API_URL=https://your-app.railway.app`;
      } else {
        // Короткое и понятное сообщение для пользователя
        error.message = "Нет подключения к интернету. Проверьте соединение и попробуйте снова.";
      }
    } else if (error.response) {
      // Сервер ответил с ошибкой
      const statusCode = error.response.status;
      const errorData = error.response.data;
      
      // Обработка ошибки 500 (Internal Server Error) - детальное логирование
      if (statusCode === 500) {
        console.error("❌ Server Error (500):", {
          statusCode,
          statusText: error.response.statusText,
          data: errorData,
          message: errorData?.message || errorData?.error || "Internal server error",
          url: error.config?.url,
          method: error.config?.method,
          requestData: error.config?.data,
        });
        
        // Пытаемся извлечь более детальное сообщение об ошибке
        const errorMessage = errorData?.message || errorData?.error || "Внутренняя ошибка сервера";
        error.message = errorMessage;
      }
      
      // Обработка ошибки 401 (Unauthorized) - токен истёк или невалиден
      if (statusCode === 401) {
        console.log("🔒 Unauthorized (401): Token expired or invalid");
        
        // Автоматически выходим из системы при 401
        try {
          const { useAuthStore } = await import("../store/authStore");
          const authStore = useAuthStore.getState();
          
          // Очищаем токен и пользователя
          if (authStore.logout) {
            await authStore.logout();
            console.log("✅ Автоматический logout выполнен из-за истёкшего токена");
          }
        } catch (logoutError) {
          console.error("⚠️ Ошибка при автоматическом logout:", logoutError);
        }
        
        error.message = "Сессия истекла. Пожалуйста, войдите снова.";
      } else if (statusCode === 404) {
        // Обработка ошибки 404 (Not Found) - маршрут не найден
        // Это может быть из-за того, что backend не обновлен
        console.log(`⚠️ Not Found (404): ${error.config?.url} - маршрут не найден на сервере`);
        // Не логируем как критическую ошибку, так как это может быть временная проблема
      } else if (statusCode === 502 || statusCode === 503 || statusCode === 504) {
        // Обработка ошибок 502 (Bad Gateway), 503 (Service Unavailable), 504 (Gateway Timeout)
        // Это означает, что сервер недоступен или перегружен
        console.log(`⚠️ Server Unavailable (${statusCode}): ${errorData?.message || "Сервер временно недоступен"}`);
        error.message = "Сервер временно недоступен. Работаем в офлайн режиме.";
        // Не логируем как критическую ошибку - это временная проблема
      } else {
        console.error("❌ Server Error:", errorData);
        // Для других ошибок логируем с полным контекстом
        logError(error, {
          context: {
            api: true,
            url: error.config?.url,
            method: error.config?.method,
            status: statusCode,
            baseURL: getBaseURL(),
          },
          userId: user?.id,
          email: user?.email,
        });
      }
    } else if (error.request) {
      // Запрос был отправлен, но ответа не получено
      console.error("📡 No response:", error.request);
      error.message = "Сервер не отвечает. Проверьте, что бэкенд запущен.";
      // Логируем ошибки сети с полным контекстом
      logError(error, {
        context: {
          api: true,
          url: error.config?.url,
          method: error.config?.method,
          baseURL: getBaseURL(),
          networkError: true,
        },
        userId: user?.id,
        email: user?.email,
      });
    } else {
      // Другие ошибки (например, ошибки конфигурации)
      logError(error, {
        context: {
          api: true,
          url: error.config?.url,
          method: error.config?.method,
          baseURL: getBaseURL(),
        },
        userId: user?.id,
        email: user?.email,
      });
    }

    return Promise.reject(error);
  }
);
