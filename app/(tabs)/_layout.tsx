import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useLanguage } from "../../src/context/LanguageContext";
import { useTheme } from "../../src/context/ThemeContext";
import { useColors } from "../../src/theme/colors";

export default function TabsLayout() {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const colors = useColors();
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 4,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t("tabs.medkit"),
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="medical-bag" size={26} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="medicines"
        options={{
          title: t("tabs.medicines"),
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="pill-multiple" size={26} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="family"
        options={{
          title: t("tabs.family"),
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="account-group" size={26} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: t("tabs.ai"),
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="robot" size={26} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="more"
        options={{
          title: t("tabs.more"),
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="dots-horizontal" size={26} color={color} />
          ),
        }}
      />

    </Tabs>
  );
}
