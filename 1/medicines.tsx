import * as Notifications from "expo-notifications";
import { useFocusEffect } from "expo-router";
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
} from "../src/database/medicine.service";

// 🔔 Просим доступ к уведомлениям
async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    console.log("Уведомления отключены");
  }
}

export default function MedicinesScreen() {
  const [items, setItems] = useState([]);

  async function loadData() {
    const data = await getAllMedicines();
    setItems(data);
  }

  useFocusEffect(
    useCallback(() => {
      requestNotificationPermission();
      loadData();
    }, [])
  );

  // 🔔 Настройка напоминания
  async function handleNotify(item) {
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
  function handleDelete(id) {
    Alert.alert("Удалить?", "Вы хотите удалить это лекарство?", [
      { text: "Отмена" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          await deleteMedicine(id);
          loadData();
        },
      },
    ]);
  }

  // 🎨 Один элемент списка
  function renderItem({ item }) {
    return (
      <View style={styles.card}>
        <Image
          source={{ uri: item.photoUri }}
          style={styles.photo}
        />

        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.info}>💊 Дозировка: {item.dose || "—"}</Text>
          <Text style={styles.info}>🧪 Форма: {item.form || "—"}</Text>
          <Text style={styles.info}>⌛ Годен до: {item.expiry || "—"}</Text>
          <Text style={styles.date}>Добавлено: {item.createdAt}</Text>

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

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F8FF" }}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
}

// ----------------------------------------------------
// 🎨 С Т И Л И
// ----------------------------------------------------
const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    elevation: 4,
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
  },

  info: {
    marginTop: 2,
    fontSize: 14,
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
  },
});
