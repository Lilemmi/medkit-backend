// 📌 Файл: app/(tabs)/home/_layout.tsx

import { Stack } from "expo-router";

export default function HomeLayout() {
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
    </Stack>
  );
}
