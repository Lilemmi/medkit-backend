import { Stack } from "expo-router";

export default function MoreLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="health"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="refill"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        // diary находится в папке diary/index.tsx, поэтому имя экрана должно совпадать
        name="diary/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="doctors"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="help"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
