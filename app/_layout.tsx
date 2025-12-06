// 📌 ФАЙЛ: app/_layout.tsx

import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { logError } from "../src/utils/errorHandler";

import { ThemeProvider, useTheme } from "../src/context/ThemeContext";
import { LanguageProvider } from "../src/context/LanguageContext";
import { initDB } from "../src/database/medicine.database";
import { useAuthStore } from "../src/store/authStore";

// Отключаем авто-скрытие Splash
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const { token, loadToken } = useAuthStore();

  const [appReady, setAppReady] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // 1. Загружаем токен (автовход)
        await loadToken();

        // 2. Инициализация базы
        await initDB();

        // 3. Проверка сроков годности при запуске
        try {
          const { checkExpiryDaily } = await import("../src/database/medicine.service");
          await checkExpiryDaily();
        } catch (err) {
          console.log("⚠️ Ошибка проверки сроков годности:", err);
        }

        // 4. Автоматическая синхронизация с сервером (если пользователь авторизован)
        try {
          const currentUser = useAuthStore.getState().user;
          if (currentUser?.id) {
            const { fullSync, isOnline } = await import("../src/services/medicine-sync.service");
            const online = await isOnline();
            if (online) {
              console.log("🔄 Начало автоматической синхронизации...");
              // Запускаем синхронизацию в фоне, не блокируя запуск приложения
              fullSync(currentUser.id).then((result) => {
                console.log("✅ Автоматическая синхронизация завершена:", result.message);
              }).catch((err) => {
                console.log("⚠️ Ошибка автоматической синхронизации:", err);
                // Не критично - пользователь может синхронизировать вручную
              });
            } else {
              console.log("📴 Нет интернета - пропускаем синхронизацию");
            }
          }
        } catch (err) {
          console.log("⚠️ Ошибка инициализации синхронизации:", err);
        }

      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logError(error, {
          context: { phase: "app_initialization" },
        });
        console.error("INIT ERROR:", err);
      } finally {
        setAppReady(true);
      }
    })();
  }, []);

  // Решаем куда направить пользователя (автовход)
  useEffect(() => {
    if (!appReady || isNavigating) return;

    const navigate = async () => {
      setIsNavigating(true);

      // Небольшая задержка для плавного перехода и завершения loadToken
      await new Promise((resolve) => setTimeout(resolve, 300));

      try {
        // Получаем актуальное значение токена из store
        const currentToken = useAuthStore.getState().token;
        const currentUser = useAuthStore.getState().user;

        console.log("🔍 Navigation check - Token:", currentToken ? "EXISTS" : "NULL", "User:", currentUser ? "EXISTS" : "NULL");

        if (currentToken) {
          console.log("🔐 TOKEN FOUND → автовход, пропускаем login/register, открываем Tabs");
          await router.replace("/(tabs)/home");
        } else {
          console.log("🔓 NO TOKEN → перенаправление на экран входа");
          await router.replace("/(auth)/login");
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logError(err, {
          context: { phase: "navigation" },
        });
        console.error("Navigation error:", error);
        // В случае ошибки проверяем токен еще раз
        const fallbackToken = useAuthStore.getState().token;
        if (fallbackToken) {
          console.log("🔄 Fallback: Token exists, redirecting to home");
          await router.replace("/(tabs)/home");
        } else {
          console.log("🔄 Fallback: No token, redirecting to login");
          await router.replace("/(auth)/login");
        }
      } finally {
        // Скрываем splash screen после навигации
        await SplashScreen.hideAsync();
      }
    };

    navigate();
  }, [appReady, token]);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <LanguageProvider>
            <ThemeProvider>
              <AppContent />
            </ThemeProvider>
          </LanguageProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const { isDark } = useTheme();
  
  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor="transparent" translucent />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen 
          name="index" 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="(onboarding)" 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="(auth)" 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="(tabs)" 
          options={{ headerShown: false }}
        />
      </Stack>
    </>
  );
}
