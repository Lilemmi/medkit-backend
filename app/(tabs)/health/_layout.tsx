import { Stack } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../../../src/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HealthLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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

