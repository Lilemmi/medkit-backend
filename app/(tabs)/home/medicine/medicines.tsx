import * as Notifications from "expo-notifications";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  deleteMedicine,
  getAllMedicines,
} from "../../../../src/database/medicine.service";
import { useAuthStore } from "../../../../src/store/authStore";

// 🔔 Просим доступ к уведомлениям
async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    console.log("Уведомления отключены");
  }
}

export default function MedicinesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [items, setItems] = useState([]);

  async function loadData() {
    if (!user?.id) {
      console.log("User not found");
      return;
    }
    
    try {
      const data = await getAllMedicines(user.id);
      setItems(data || []);
    } catch (error) {
      console.error("Error loading medicines:", error);
      setItems([]);
    }
  }

  useFocusEffect(
    useCallback(() => {
      requestNotificationPermission();
      loadData();
    }, [user?.id])
  );

  // 🔔 Настройка напоминания
  async function handleNotify(item: any) {
    if (!item.expiry) {
      Alert.alert("Нет срока", "Дата окончания не указана");
      return;
    }

    const target = new Date(item.expiry);
    target.setDate(target.getDate() - 2);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⚠️ Лекарство скоро просрочится",
        body: `${item.name} (${item.dose || ""}) годен до ${item.expiry}`,
      },
      trigger: target,
    });

    Alert.alert("Уведомление установлено", "Напомню за 2 дня 👍");
  }

  // 🗑️ Удаление
  function handleDelete(id: number) {
    Alert.alert("Удалить?", "Вы хотите удалить это лекарство?", [
      { text: "Отмена" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMedicine(id);
            loadData();
          } catch (error) {
            console.error("Error deleting medicine:", error);
            Alert.alert("Ошибка", "Не удалось удалить лекарство");
          }
        },
      },
    ]);
  }

  // 🎨 Один элемент списка
  function renderItem({ item }: any) {
    return (
      <View style={styles.card}>
        {item.photoUri && (
          <Image
            source={{ uri: item.photoUri }}
            style={styles.photo}
          />
        )}

        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name || "Без названия"}</Text>
          <Text style={styles.info}>💊 Дозировка: {item.dose || "—"}</Text>
          <Text style={styles.info}>🧪 Форма: {item.form || "—"}</Text>
          <Text style={styles.info}>⌛ Годен до: {item.expiry || "—"}</Text>
          <Text style={styles.date}>Добавлено: {item.createdAt || "—"}</Text>

          <View style={styles.buttonsRow}>
            <TouchableOpacity style={styles.btn} onPress={() => handleNotify(item)}>
              <Text style={styles.btnText}>🔔 Напомнить</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "#FF6B6B" }]}
              onPress={() => handleDelete(item.id)}
            >
              <Text style={styles.btnText}>Удалить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (!user?.id) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Аптечка пуста</Text>
          <Text style={styles.emptySubtext}>Добавьте первое лекарство</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
}

// ----------------------------------------------------
// 🎨 С Т И Л И
// ----------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8FF",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: "#999",
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  photo: {
    width: 90,
    height: 90,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: "#eee",
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  info: {
    marginTop: 2,
    fontSize: 14,
    color: "#333",
  },
  date: {
    marginTop: 4,
    fontSize: 12,
    color: "#666",
  },
  buttonsRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    backgroundColor: "#4A90E2",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  btnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});




