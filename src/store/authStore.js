import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import { fetchProfileApi, loginApi, registerApi } from "../api/auth";
import { registerPushToken } from "../utils/notifications";

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  loading: false,
  error: null,

  // 🔐 Вход
  login: async (email, password) => {
    set({ loading: true, error: null });

    // Логируем, что получаем
    console.log("🔐 LOGIN CALLED with:", { email, password: password ? "***" : undefined });

    try {
      const { user, token } = await loginApi(email, password);

      // Сохраняем JWT
      await SecureStore.setItemAsync("token", token);

      // Регистрируем push-уведомления
      registerPushTokenSafely();

      set({ user, token, loading: false, error: null });
      return true;

    } catch (e) {
      console.log("LOGIN ERROR:", e?.response?.data || e?.message || e);

      let errorMessage = "Ошибка входа";
      
      if (e?.message) {
        // Используем сообщение из interceptor
        errorMessage = e.message;
      } else if (e?.response?.data?.message) {
        // Сообщение от сервера
        errorMessage = e.response.data.message;
      } else if (e?.response?.status === 401) {
        errorMessage = "Неверный email или пароль";
      } else if (e?.response?.status === 404) {
        errorMessage = "Пользователь не найден";
      }

      set({
        error: errorMessage,
        loading: false,
      });

      return false;
    }
  },

  // 🆕 Регистрация
  register: async (name, email, password) => {
    set({ loading: true, error: null });

    // Логируем, что получаем
    console.log("🆕 REGISTER CALLED with:", { name, email, password: password ? "***" : undefined });

    try {
      const { user, token } = await registerApi(name, email, password);

      // Сохраняем JWT
      await SecureStore.setItemAsync("token", token);

      // Регистрируем push-уведомления
      registerPushTokenSafely();

      set({ user, token, loading: false, error: null });
      return true;

    } catch (e) {
      console.log("REGISTER ERROR:", e?.response?.data || e?.message || e);

      let errorMessage = "Ошибка регистрации";
      
      if (e?.message) {
        // Используем сообщение из interceptor
        errorMessage = e.message;
      } else if (e?.response?.data?.message) {
        // Сообщение от сервера
        errorMessage = e.response.data.message;
      } else if (e?.response?.status === 409) {
        errorMessage = "Пользователь с таким email уже существует";
      } else if (e?.response?.status === 400) {
        errorMessage = "Неверные данные для регистрации";
      }

      set({
        error: errorMessage,
        loading: false,
      });

      return false;
    }
  },

  // 🚪 Выход
  logout: async () => {
    try {
      await SecureStore.deleteItemAsync("token");
    } catch (e) {
      console.log("TOKEN DELETE ERROR:", e);
    }

    set({ user: null, token: null, error: null });
  },

  // ♻ Автологин
  loadToken: async () => {
    try {
      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        console.log("🔓 NO TOKEN in storage");
        set({ token: null, user: null });
        return;
      }

      console.log("🔐 RESTORED TOKEN:", token.substring(0, 20) + "...");
      // ВАЖНО: Устанавливаем токен СРАЗУ, чтобы автовход работал даже если профиль не загрузится
      set({ token });

      // Загружаем профиль (не блокируем автовход при ошибке сети)
      try {
        const user = await fetchProfileApi();

        if (user) {
          console.log("✅ PROFILE LOADED:", user.name || user.email);
          set({ user });
        } else {
          // если сервер вернул null → токен невалидный, сброс
          console.log("⚠️ PROFILE NULL → токен невалидный, удаляем");
          await SecureStore.deleteItemAsync("token");
          set({ token: null, user: null });
        }
      } catch (err) {
        // Проверяем тип ошибки
        const status = err?.response?.status;
        const isAuthError = status === 401 || status === 403;
        const isNetworkError = err?.code === "ERR_NETWORK" || 
                              err?.message?.includes("Network") ||
                              err?.message?.includes("timeout") ||
                              !err?.response; // Нет ответа от сервера

        if (isAuthError) {
          // Токен невалидный или истек - удаляем
          console.log("❌ AUTH ERROR (401/403) → токен невалидный, удаляем");
          await SecureStore.deleteItemAsync("token");
          set({ token: null, user: null });
        } else if (isNetworkError) {
          // Сетевая ошибка - оставляем токен, пользователь останется авторизованным
          console.log("⚠️ NETWORK ERROR → оставляем токен, пользователь останется авторизованным");
          console.log("   Error details:", err?.message || err?.code || "Unknown network error");
          // Не удаляем токен при сетевой ошибке - пользователь сможет войти
          // Профиль загрузится позже, когда сеть будет доступна
          // Для офлайн режима можно использовать кэшированные данные
        } else {
          // Другая ошибка - логируем, но не удаляем токен сразу
          console.log("⚠️ PROFILE ERROR (other):", err?.message || err);
          console.log("   Status:", status);
          // Оставляем токен, чтобы не выкидывать пользователя при временных ошибках сервера
        }
      }

    } catch (e) {
      console.log("❌ LOAD TOKEN ERROR:", e);
    }
  },

  // ➕ Обновить данные юзера вручную
  setUser: (user) => set({ user }),
}));


// ---------------------------------------------------------
// 🔔 Безопасный вызов регистрации Push Token
// (чтобы не ломало приложение)
// ---------------------------------------------------------
async function registerPushTokenSafely() {
  try {
    const expoToken = await registerPushToken();
    if (expoToken) {
      console.log("Push token registered:", expoToken.substring(0, 20) + "...");
      // TODO: отправить на бэкенд
    }
  } catch (e) {
    // Тихая обработка - push-уведомления не критичны
    if (e?.message?.includes("FirebaseApp") || e?.message?.includes("Firebase")) {
      // Firebase не настроен - это нормально, если не используем push-уведомления
      console.log("Push notifications: Firebase not configured (optional)");
    } else {
      console.log("Push token registration error:", e?.message || e);
    }
  }
}
