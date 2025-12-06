import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { getExpiredMedicines } from "../../../../src/database/medicine.service";
// @ts-expect-error: Модуль не имеет декларации типов
import { useAuthStore } from "../../../../src/store/authStore";
import { colors } from "../../../../src/theme/colors";

// --------------------------------------
// TODO: Тип Medicine лучше вынести в src/types/medicine.ts
interface Medicine {
  id: number;
  name: string;
  dose?: string | null;
  form?: string | null;
  expiry: string | null;
  photoUri?: string | null;
  userId?: number | null;
}
// --------------------------------------

export default function ExpiredMedicinesScreen() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [items, setItems] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 📌 загрузка данных
  const loadData = async () => {
    setLoading(true);

    try {
      const data = await getExpiredMedicines();
      setItems(Array.isArray(data) ? (data as Medicine[]) : []);
    } catch (e) {
      console.log("Expired load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 📌 Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // 🟢 Пустой экран
  if (!loading && items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>✔️</Text>
        <Text style={styles.emptyTitle}>Нет просроченных лекарств</Text>
        <Text style={styles.emptyText}>Отличная работа! Всё актуально 🙌</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⛔ Просроченные лекарства</Text>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push(`/(tabs)/home/medicine/${item.id}`)
            }
          >
            <View style={styles.cardRow}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.expiredDate}>до {item.expiry}</Text>
            </View>

            {item.dose ? (
              <Text style={styles.cardDose}>{item.dose}</Text>
            ) : null}

            {item.form ? (
              <Text style={styles.cardForm}>{item.form}</Text>
            ) : null}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// ==============================
//            СТИЛИ
// ==============================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 20,
    color: colors.text,
  },

  card: {
    backgroundColor: "#FFE5E5",
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: "#D93636",
  },

  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  cardName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    maxWidth: "70%",
  },

  expiredDate: {
    fontSize: 16,
    color: "#B00000",
    fontWeight: "700",
  },

  cardDose: {
    fontSize: 15,
    color: "#444",
    marginTop: 6,
  },

  cardForm: {
    fontSize: 14,
    color: "#666",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },

  emptyIcon: {
    fontSize: 60,
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});
