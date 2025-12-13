import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ru from "./locales/ru.json";
import en from "./locales/en.json";
import he from "./locales/he.json";

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: "v4",
    resources: {
      ru: { translation: ru },
      en: { translation: en },
      he: { translation: he },
    },
    lng: "ru", // язык по умолчанию
    fallbackLng: "ru",
    interpolation: {
      escapeValue: false, // React уже экранирует
    },
  });

export default i18n;










