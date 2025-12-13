// 📌 Файл: app/(tabs)/home/_layout.tsx

import { Stack, useFocusEffect, usePathname, useRouter } from "expo-router";
import { useCallback } from "react";

export default function HomeLayout() {
  const router = useRouter();
  const pathname = usePathname();

  // Убрана логика router.replace() - навигация управляется Tab Navigator
  // При переключении на вкладку Tab Navigator сам управляет стеком

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="index" 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="add/index" 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="add/manual" 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="add/scan" 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="add/reminder" 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="add/prescription" 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="medicine/[id]" 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="medicines" 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="expired" 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="schedule" 
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
