import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, Alert } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { getAllMedicines } from "../../database/medicine.service";
import { useAuthStore } from "../../store/authStore";
import { fullSync } from "../../services/medicine-sync.service";
import { isOnline } from "../../utils/network";

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadMedicines = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const data = await getAllMedicines(user.id);
      setMedicines(data);
    } catch (error) {
      console.error("Error loading medicines:", error);
      Alert.alert("Ошибка", "Не удалось загрузить лекарства");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!user?.id) return;

    const online = await isOnline();
    if (!online) {
      Alert.alert("Нет интернета", "Синхронизация требует подключения к интернету");
      return;
    }

    setSyncing(true);
    try {
      const result = await fullSync(user.id);
      await loadMedicines();
      Alert.alert("Синхронизация", result.message || "Синхронизация завершена");
    } catch (error) {
      console.error("Sync error:", error);
      Alert.alert("Ошибка", "Не удалось синхронизировать данные");
    } finally {
      setSyncing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMedicines();
    setRefreshing(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadMedicines();
      // Автоматическая синхронизация при открытии экрана (если онлайн)
      if (user?.id) {
        isOnline().then((online) => {
          if (online) {
            fullSync(user.id).catch(console.error);
          }
        });
      }
    }, [user?.id])
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💊 Моя аптечка</Text>
        <TouchableOpacity
          style={styles.syncButton}
          onPress={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#4A90E2" />
          ) : (
            <Text style={styles.syncButtonText}>🔄 Синхронизировать</Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={medicines}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.medicineCard}
            onPress={() => navigation.navigate("Details", { item })}
          >
            <Text style={styles.medicineName}>{item.name || "Без названия"}</Text>
            {item.dose && <Text style={styles.medicineDose}>Дозировка: {item.dose}</Text>}
            {item.expiry && (
              <Text style={styles.medicineExpiry}>
                Срок годности: {new Date(item.expiry).toLocaleDateString("ru-RU")}
              </Text>
            )}
            {item.serverId && (
              <Text style={styles.syncedBadge}>✓ Синхронизировано</Text>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Нет лекарств</Text>
            <Text style={styles.emptySubtext}>Добавьте первое лекарство</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={medicines.length === 0 ? styles.emptyList : undefined}
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("Add")}
      >
        <Text style={styles.addButtonText}>+ Добавить лекарство</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  syncButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#e3f2fd",
  },
  syncButtonText: {
    color: "#4A90E2",
    fontSize: 12,
    fontWeight: "600",
  },
  medicineCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  medicineDose: {
    fontSize: 14,
    color: "#666",
    marginBottom: 3,
  },
  medicineExpiry: {
    fontSize: 14,
    color: "#ff6b6b",
    marginTop: 5,
  },
  syncedBadge: {
    fontSize: 10,
    color: "#4caf50",
    marginTop: 5,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: "#999",
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#bbb",
  },
  emptyList: {
    flexGrow: 1,
  },
  addButton: {
    backgroundColor: "#4A90E2",
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
