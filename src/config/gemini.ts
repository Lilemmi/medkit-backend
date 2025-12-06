// Получаем API ключи из переменных окружения
const getApiKeysFromEnv = (): string[] => {
  const envKeys = process.env.EXPO_PUBLIC_GEMINI_API_KEYS;
  if (envKeys) {
    return envKeys.split(",").map(key => key.trim()).filter(key => key.length > 0);
  }
  console.warn("⚠️ EXPO_PUBLIC_GEMINI_API_KEYS не настроен!");
  return [];
};
export const GEMINI_API_KEYS = getApiKeysFromEnv();
let currentKeyIndex = 0;
export function getCurrentApiKey(): string {
  return GEMINI_API_KEYS[currentKeyIndex];
}
export function getCurrentKeyIndex(): number {
  return currentKeyIndex;
}
export function switchToNextKey(): boolean {
  currentKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length;
  return true;
}
export function resetKeyIndex(): void {
  currentKeyIndex = 0;
}
export const GEMINI_API_KEY = getCurrentApiKey();
