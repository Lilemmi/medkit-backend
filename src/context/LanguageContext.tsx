import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { I18n } from "i18next";
import i18n from "../i18n/i18n";

type Language = "ru" | "en" | "he";

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, options?: any) => string;
  i18n: I18n;
};

const LanguageContext = createContext<LanguageContextType>({
  language: "ru",
  setLanguage: async () => {},
  t: (key: string) => key,
  i18n: i18n,
});

const LANGUAGE_STORAGE_KEY = "app_language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ru");
  const [isReady, setIsReady] = useState(false);

  // Загружаем сохраненный язык при инициализации
  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await SecureStore.getItemAsync(LANGUAGE_STORAGE_KEY);
      if (savedLanguage && (savedLanguage === "ru" || savedLanguage === "en" || savedLanguage === "he")) {
        await changeLanguage(savedLanguage as Language);
      } else {
        // Определяем язык устройства
        const deviceLanguage = getDeviceLanguage();
        await changeLanguage(deviceLanguage);
      }
    } catch (error) {
      console.log("Error loading language:", error);
      await changeLanguage("ru");
    } finally {
      setIsReady(true);
    }
  };

  const getDeviceLanguage = (): Language => {
    // В React Native можно использовать локализацию устройства
    // Для простоты используем русский по умолчанию
    return "ru";
  };

  const changeLanguage = async (lang: Language) => {
    try {
      await i18n.changeLanguage(lang);
      setLanguageState(lang);
      await SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, lang);
    } catch (error) {
      console.log("Error changing language:", error);
    }
  };

  const setLanguage = async (lang: Language) => {
    await changeLanguage(lang);
  };

  const t = (key: string, options?: any) => {
    return i18n.t(key, options);
  };

  if (!isReady) {
    return null; // Можно показать загрузку
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, i18n }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}




