import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { BackHandler, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getExpiredMedicines } from "../../../src/database/medicine.service";
import { useAuthStore } from "../../../src/store/authStore";
import { useColors } from "../../../src/theme/colors";
import { useLanguage } from "../../../src/context/LanguageContext";
import type { MedicineRow } from "../../../src/types/db";

export default function ExpiredScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();
  const { user } = useAuthStore();
  const [list, setList] = useState<MedicineRow[]>([]);

  // Обработка системной кнопки "Назад" (Android)
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.back();
        return true;
      };

      const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => backHandler.remove();
    }, [router])
  );

  useEffect(() => {
    load();
  }, [user?.id]);

  async function load() {
    if (!user?.id) return;
    const data = await getExpiredMedicines(user.id);
    setList(data);
  }

  const formatDaysAgo = (dateStr: string) => {
    const diff =
      (new Date().getTime() - new Date(dateStr).getTime()) /
      (1000 * 60 * 60 * 24);

    const days = Math.ceil(diff);
    return days === 0 ? "сегодня" : `${days} дн. назад`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Просроченные лекарства</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>Просроченные лекарства</Text>

      <ScrollView style={{ width: "100%", paddingHorizontal: 22 }}>
        {list.length === 0 && (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>Отлично! Здесь пока пусто 👏</Text>
        )}

        {list.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.card, { backgroundColor: colors.surface }]}
            onPress={() =>
              router.push(`/(tabs)/home/medicine/${item.id}` as any)
            }
          >
            <View style={styles.row}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={34}
                color="#D93636"
              />

              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>

                <Text style={styles.expiredText}>
                  истёк {item.expiry ? formatDaysAgo(item.expiry) : "—"}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 20,
    marginTop: 20,
    paddingHorizontal: 22,
  },
  empty: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 18,
    paddingHorizontal: 22,
  },

  card: {
    width: "100%",
    padding: 18,
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  info: {
    marginLeft: 14,
  },

  name: {
    fontSize: 18,
    fontWeight: "600",
  },

  expiredText: {
    marginTop: 6,
    color: "#D93636",
    fontWeight: "500",
  },
});
