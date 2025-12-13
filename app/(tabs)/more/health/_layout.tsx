import { Stack } from "expo-router";

export default function HealthLayout() {
  // Убрана логика router.replace() - навигация управляется Stack навигатором

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
        name="blood-pressure"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="pulse"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="temperature"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="weight"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="blood-sugar"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="symptoms"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="mood"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="activity"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="sleep"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="water"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="doctor-visits"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="lab-results"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

