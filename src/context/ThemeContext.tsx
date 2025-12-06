import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";

type Theme = "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => Promise<void>;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: async () => {},
  isDark: false,
});

const THEME_STORAGE_KEY = "app_theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [isReady, setIsReady] = useState(false);

  // Загружаем сохраненную тему при инициализации
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme as Theme);
      }
    } catch (error) {
      console.log("Error loading theme:", error);
    } finally {
      setIsReady(true);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    try {
      await SecureStore.setItemAsync(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.log("Error saving theme:", error);
    }
  };

  if (!isReady) {
    return null; // Можно показать загрузку
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
