import { Stack } from "expo-router";

export default function NotificationsLayout() {
  // Убрана логика router.replace() - навигация управляется Stack навигатором

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="reminders" />
    </Stack>
  );
}
