export const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || "";
if (!OPENAI_API_KEY) {
  console.warn("⚠️ EXPO_PUBLIC_OPENAI_API_KEY не настроен!");
}
