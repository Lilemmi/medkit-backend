import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { logError } from "../utils/errorHandler";
import { useAuthStore } from "../store/authStore";

// Определяем базовый URL API
// Только Railway URL (продакшен) - локальный сервер больше не используется
const getBaseURL = () => {
  // 1. Проверяем Railway URL из app.json (приоритет)
  const railwayUrl = 
    Constants.expoConfig?.extra?.railwayApiUrl ||
    Constants.manifest?.extra?.railwayApiUrl;
  
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
    Constants.manifest?.extra?.apiUrl;
    
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
console.log("🌐 API Base URL initialized:", baseURL);

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
  (error) => {
    // Получаем информацию о пользователе для контекста
    const user = useAuthStore.getState().user;
    
    if (error.code === "ECONNABORTED") {
      console.error("⏱️ Request timeout");
      error.message = "Превышено время ожидания. Проверьте подключение к интернету.";
    } else if (error.message === "Network Error" || error.code === "ERR_NETWORK") {
      const baseURL = getBaseURL();
      console.error("🌐 Network Error:", {
        baseURL,
        message: error.message,
        platform: Platform.OS,
        code: error.code,
      });
      
      // Проверяем, не является ли это ошибкой из-за неправильной настройки URL
      if (baseURL.includes("RAILWAY-URL-NOT-CONFIGURED")) {
        error.message = `Railway API URL не настроен!\n\nДобавьте Railway URL в app.json:\n"railwayApiUrl": "https://your-app.railway.app"\n\nИли создайте .env файл:\nEXPO_PUBLIC_API_URL=https://your-app.railway.app`;
      } else {
        // Более понятное сообщение об ошибке
        // Всегда используем Railway, локальный сервер больше не используется
        error.message = `Ошибка подключения к серверу Railway.\n\nПроверьте:\n1. Интернет соединение\n2. Railway сервер запущен и работает\n3. URL правильный: ${baseURL}\n4. Railway URL настроен в app.json`;
      }
    } else if (error.response) {
      // Сервер ответил с ошибкой
      console.error("❌ Server Error:", error.response.data);
    } else if (error.request) {
      // Запрос был отправлен, но ответа не получено
      console.error("📡 No response:", error.request);
      error.message = "Сервер не отвечает. Проверьте, что бэкенд запущен.";
    }

    // Логируем ошибку API с контекстом
    logError(error, {
      context: {
        api: true,
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        baseURL: getBaseURL(),
      },
      userId: user?.id,
      email: user?.email,
    });

    return Promise.reject(error);
  }
);
