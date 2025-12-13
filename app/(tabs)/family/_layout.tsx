import { Stack, useFocusEffect, usePathname, useRouter } from "expo-router";
import { useCallback } from "react";

export default function FamilyLayout() {
  const router = useRouter();
  const pathname = usePathname();

  // Убрана логика router.replace() - навигация управляется Tab Navigator

  return <Stack screenOptions={{ headerShown: false }} />;
}
