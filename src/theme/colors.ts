import { useTheme } from "../context/ThemeContext";

export const lightColors = {
  primary: "#4A90E2",
  accent: "#FF4F81",
  background: "#F7F9FC",
  surface: "#FFFFFF",
  text: "#1A1A1A",
  textSecondary: "#8E8E93",
  card: "#FFFFFF",
  border: "#E0E6ED",
  white: "#FFFFFF",
  lightGray: "#F7F9FC",
  gray: "#8E8E93",
  darkGray: "#1A1A1A",
  error: "#FF3B30",
  success: "#34C759",
  warning: "#FF9500",
  info: "#007AFF",
  shadow: "#000000",
};

export const darkColors = {
  primary: "#5A9FEF",
  accent: "#FF5F91",
  background: "#000000",
  surface: "#1C1C1E",
  text: "#FFFFFF",
  textSecondary: "#8E8E93",
  card: "#1C1C1E",
  border: "#38383A",
  white: "#FFFFFF",
  lightGray: "#2C2C2E",
  gray: "#8E8E93",
  darkGray: "#FFFFFF",
  error: "#FF453A",
  success: "#30D158",
  warning: "#FF9F0A",
  info: "#0A84FF",
  shadow: "#000000",
};

// Хук для получения цветов в зависимости от темы
export function useColors() {
  const { isDark } = useTheme();
  return isDark ? darkColors : lightColors;
}

// Для использования вне компонентов (старый способ)
export const colors = lightColors;
