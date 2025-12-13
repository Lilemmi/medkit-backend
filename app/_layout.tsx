// 📌 ФАЙЛ: app/_layout.tsx

import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { logError } from "../src/utils/errorHandler";
import { AnimatedSplashScreen } from "../src/components/AnimatedSplashScreen";

import { ThemeProvider, useTheme } from "../src/context/ThemeContext";
import { LanguageProvider } from "../src/context/LanguageContext";
import { initDB } from "../src/database/medicine.database";
import { useAuthStore } from "../src/store/authStore";

// Отключаем авто-скрытие Splash
SplashScreen.preventAutoHideAsync();

// Безопасная загрузка анимации splash screen
// Используем require для включения в bundle - Metro bundler включит файл в production bundle
// Файл уже включен в bundle (видно в логах сборки)
const animationModule = require("../assets/animations/splash-animation.json");
const animationSource = animationModule.default || animationModule;

// Проверяем, что это валидный Lottie JSON
if (animationSource && typeof animationSource === 'object' && (animationSource.v || animationSource.fr || animationSource.w)) {
  console.log("✅ Splash анимация загружена, размер:", animationSource.w, "x", animationSource.h);
} else {
  console.log("⚠️ Анимация загружена, но формат неверный");
}

// Глобальные флаги для предотвращения повторной инициализации
// (используем переменные модуля, а не ref'ы, чтобы они не сбрасывались при перемонтировании)
let globalInitDone = false;
let globalNavigationDone = false;
let globalAppReady = false;

export default function RootLayout() {
  const router = useRouter();
  const { loadToken } = useAuthStore();

  const [appReady, setAppReady] = useState(globalAppReady);
  const [showSplash, setShowSplash] = useState(true);

  // Инициализация приложения - ТОЛЬКО ОДИН РАЗ
  useEffect(() => {
    // Если инициализация уже выполнена, просто устанавливаем appReady
    if (globalInitDone) {
      if (!globalAppReady) {
        globalAppReady = true;
        setAppReady(true);
      }
      return;
    }

    // Устанавливаем флаг СРАЗУ, до начала асинхронных операций
    globalInitDone = true;

    (async () => {
      try {
        console.log("🚀 Начало инициализации приложения...");
        
        // 1. Загружаем токен (автовход)
        await loadToken();

        // 2. Инициализация базы
        await initDB();

        // 2.1. Инициализация канала уведомлений для Android и запрос разрешений
        try {
          const { setupNotificationChannel, registerPushToken } = await import("../src/utils/notifications");
          const NotificationsModule = await import("expo-notifications");
          // При динамическом импорте модуль может быть в .default или напрямую
          const Notifications = NotificationsModule.default || NotificationsModule;
          
          if (!Notifications || typeof Notifications.getPermissionsAsync !== "function") {
            console.log("⚠️ expo-notifications не доступен или не загружен корректно");
            return;
          }
          
          // Запрашиваем разрешения на уведомления
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;
          
          if (existingStatus !== "granted") {
            const { status } = await Notifications.requestPermissionsAsync({
              ios: {
                allowAlert: true,
                allowBadge: true,
                allowSound: true,
              },
            });
            finalStatus = status;
          }
          
          if (finalStatus === "granted") {
            console.log("✅ Разрешения на уведомления получены");
            // Настраиваем канал уведомлений
            if (typeof setupNotificationChannel === "function") {
              await setupNotificationChannel();
            }
            // Регистрируем push token (опционально)
            if (typeof registerPushToken === "function") {
              await registerPushToken();
            }
          } else {
            console.log("⚠️ Разрешения на уведомления не предоставлены");
          }
        } catch (err) {
          console.log("⚠️ Ошибка инициализации уведомлений:", err);
        }

        // 3. Проверка сроков годности при запуске
        try {
          const { checkExpiryDaily } = await import("../src/database/medicine.service");
          const currentUser = useAuthStore.getState().user;
          if (currentUser?.id) {
            await checkExpiryDaily(currentUser.id);
          }
        } catch (err) {
          console.log("⚠️ Ошибка проверки сроков годности:", err);
        }

        // 3.1. Автоматическая очистка старых записей из deleted_medicines (старше 30 дней)
        try {
          const { cleanupDeletedMedicines } = await import("../src/database/medicine.service");
          const currentUser = useAuthStore.getState().user;
          if (currentUser?.id) {
            // Очищаем записи старше 30 дней в фоне
            cleanupDeletedMedicines(currentUser.id, 30).then((count) => {
              if (count > 0) {
                console.log(`🧹 Автоматически очищено ${count} старых записей из deleted_medicines`);
              }
            }).catch((err) => {
              console.log("⚠️ Ошибка очистки deleted_medicines:", err);
            });
          }
        } catch (err) {
          console.log("⚠️ Ошибка инициализации очистки базы данных:", err);
        }

        // 3.2. Инициализация периодических напоминаний о пополнении
        try {
          const currentUser = useAuthStore.getState().user;
          if (currentUser?.id) {
            const { scheduleRefillReminders } = await import("../src/services/refill-reminder.service");
            // Запускаем в фоне
            scheduleRefillReminders(currentUser.id).then(() => {
              console.log("✅ Периодические напоминания о пополнении инициализированы");
            }).catch((err) => {
              console.log("⚠️ Ошибка инициализации напоминаний о пополнении:", err);
            });

            // Проверяем все лекарства на низкое количество таблеток
            const { checkAllMedicinesForLowStock } = await import("../src/database/medication-log.service");
            checkAllMedicinesForLowStock(currentUser.id).then(() => {
              console.log("✅ Проверка низкого количества таблеток завершена");
            }).catch((err) => {
              console.log("⚠️ Ошибка проверки низкого количества таблеток:", err);
            });

            // Мигрируем существующие фотографии в постоянную папку
            try {
              const { getAllMedicines } = await import("../src/database/medicine.service");
              const medicinePhotoStorage = await import("../src/utils/medicine-photo-storage");
              if (medicinePhotoStorage.migrateExistingPhotos) {
                const medicines = await getAllMedicines(currentUser.id);
                await medicinePhotoStorage.migrateExistingPhotos(medicines.map((m: any) => ({
                  id: m.id,
                  photoUri: m.photoUri,
                  userId: currentUser.id
                })));
                console.log("✅ Миграция фотографий завершена");
              } else {
                console.log("⚠️ migrateExistingPhotos не доступна");
              }
            } catch (err) {
              console.log("⚠️ Ошибка миграции фотографий:", err);
            }
          }
        } catch (err) {
          console.log("⚠️ Ошибка инициализации напоминаний о пополнении:", err);
        }

        // 4. Миграция и очистка фотографий лекарств
        try {
          const currentUser = useAuthStore.getState().user;
          if (currentUser?.id) {
            // Очищаем невалидные photoUri (асинхронно, не блокируем запуск)
            const { cleanupInvalidPhotoUris } = await import("../src/database/medicine.service");
            cleanupInvalidPhotoUris(currentUser.id).then((result) => {
              if (result.cleaned > 0) {
                console.log(`🧹 Очищено ${result.cleaned} невалидных photoUri при запуске`);
              }
            }).catch((err) => {
              console.log("⚠️ Ошибка очистки невалидных photoUri:", err);
            });
          }
        } catch (err) {
          console.log("⚠️ Ошибка инициализации очистки photoUri:", err);
        }

        // 5. Автоматическая синхронизация с сервером (если пользователь авторизован)
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
              });
            } else {
              console.log("📴 Нет интернета - пропускаем синхронизацию");
            }
          }
        } catch (err) {
          console.log("⚠️ Ошибка инициализации синхронизации:", err);
        }

        console.log("✅ Инициализация завершена");
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logError(error, {
          context: { phase: "app_initialization" },
        });
        console.error("❌ INIT ERROR:", err);
      } finally {
        globalAppReady = true;
        setAppReady(true);
        console.log("✅ appReady установлен в true");
      }
    })();
  }, []);

  // Навигация - ТОЛЬКО ОДИН РАЗ
  useEffect(() => {
    // Если навигация уже выполнена, просто скрываем splash
    if (globalNavigationDone) {
      setShowSplash(false);
      SplashScreen.hideAsync().catch(() => {});
      return;
    }

    // Если приложение еще не готово, ждем
    if (!appReady || !globalAppReady) {
      return;
    }

    // Устанавливаем флаг СРАЗУ, до начала навигации
    globalNavigationDone = true;

    const navigate = async () => {
      console.log("🧭 Начало навигации...");

      // Небольшая задержка для плавности
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      try {
        // Получаем актуальное значение токена из store
        const currentToken = useAuthStore.getState().token;
        const currentUser = useAuthStore.getState().user;

        console.log("🔍 Navigation check - Token:", currentToken ? "EXISTS" : "NULL", "User:", currentUser ? "EXISTS" : "NULL");

        if (currentToken) {
          console.log("🔐 TOKEN FOUND → автовход, открываем Tabs");
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
        console.error("❌ Navigation error:", error);
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
        setShowSplash(false);
        // Небольшая задержка для плавного перехода
        await new Promise((resolve) => setTimeout(resolve, 200));
        try {
          await SplashScreen.hideAsync();
          console.log("✅ Splash screen скрыт");
        } catch (error) {
          console.log("⚠️ Ошибка скрытия splash screen:", error);
        }
      }
    };

    navigate();
  }, [appReady, router]);

  // Таймаут безопасности для splash screen
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (showSplash) {
        console.log("⏱️ Splash screen timeout - принудительное скрытие");
        setShowSplash(false);
        SplashScreen.hideAsync().catch(() => {});
      }
    }, 4000); // Максимум 4 секунды

    return () => clearTimeout(timeout);
  }, [showSplash]);

  // Обработка нажатий на уведомления
  useEffect(() => {
    // Обрабатываем нажатия только после полной загрузки приложения
    if (!appReady || !globalAppReady) {
      return;
    }

    // Обработчик для нажатий на уведомления, когда приложение открыто
    const notificationListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      
      // Проверяем, что это уведомление о лекарстве (есть reminderId или medicineId)
      // Также проверяем categoryIdentifier для надежности
      const isMedicationReminder = 
        response.notification.request.content.categoryIdentifier === "medication-reminder" ||
        response.notification.request.content.categoryIdentifier === "medication-reminders" ||
        data?.reminderId || 
        data?.medicineId;
      
      if (isMedicationReminder) {
        console.log("🔔 Нажатие на уведомление о лекарстве:", data);
        
        // Перенаправляем на экран расписания, где можно подтвердить прием
        // Используем setTimeout для гарантии, что навигация произойдет после полной загрузки
        setTimeout(() => {
          try {
            // Проверяем, что пользователь авторизован
            const currentToken = useAuthStore.getState().token;
            if (currentToken) {
              router.push("/(tabs)/home/schedule");
            } else {
              console.log("⚠️ Пользователь не авторизован, пропускаем навигацию");
            }
          } catch (error) {
            console.error("Ошибка навигации при нажатии на уведомление:", error);
          }
        }, 500);
      }
    });

    // Обработчик для уведомлений, полученных когда приложение было в фоне
    // (когда пользователь нажимает на уведомление в шторке)
    const handleLastNotification = async () => {
      try {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response) {
          const data = response.notification.request.content.data;
          
          const isMedicationReminder = 
            response.notification.request.content.categoryIdentifier === "medication-reminder" ||
            response.notification.request.content.categoryIdentifier === "medication-reminders" ||
            data?.reminderId || 
            data?.medicineId;
          
          if (isMedicationReminder) {
            console.log("🔔 Обработка последнего уведомления о лекарстве:", data);
            
            // Небольшая задержка, чтобы приложение успело загрузиться
            setTimeout(() => {
              try {
                // Проверяем, что пользователь авторизован
                const currentToken = useAuthStore.getState().token;
                if (currentToken) {
                  router.push("/(tabs)/home/schedule");
                } else {
                  console.log("⚠️ Пользователь не авторизован, пропускаем навигацию");
                }
              } catch (error) {
                console.error("Ошибка навигации при обработке последнего уведомления:", error);
              }
            }, 1000);
          }
        }
      } catch (error) {
        console.error("Ошибка получения последнего уведомления:", error);
      }
    };

    // Проверяем последнее уведомление при загрузке приложения
    handleLastNotification();

    return () => {
      notificationListener.remove();
    };
  }, [router, appReady]);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          {showSplash ? (
            <AnimatedSplashScreen
              animationSource={animationSource}
              onAnimationFinish={() => {
                // Анимация завершена, но скрытие контролируется основным useEffect
                console.log("✅ Анимация splash завершена");
              }}
            />
          ) : (
            <LanguageProvider>
              <ThemeProvider>
                <AppContent />
              </ThemeProvider>
            </LanguageProvider>
          )}
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
