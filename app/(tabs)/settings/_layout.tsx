import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../../../src/theme/colors";

export default function SettingsLayout() {
  const router = useRouter();
  
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
        name="profile"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="about"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
