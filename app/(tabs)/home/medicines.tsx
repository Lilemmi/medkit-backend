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
  checkExpiryDaily,
  updateMedicine,
} from "../../../src/database/medicine.service";
import { useAuthStore } from "../../../src/store/authStore";
import { useColors } from "../../../src/theme/colors";
import { useLanguage } from "../../../src/context/LanguageContext";
import Modal, { ModalInput } from "../../../src/components/Modal";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ExpiryDatePicker from "../../../src/components/ExpiryDatePicker";
import { formatExpiryDate } from "../../../src/utils/date-formatter";
import type { MedicineRow } from "../../../src/types/db";

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
  const colors = useColors();
  const { t } = useLanguage();
  const [items, setItems] = useState<MedicineRow[]>([]);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editDose, setEditDose] = useState("");
  const [editForm, setEditForm] = useState("");
  const [editExpiry, setEditExpiry] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadData() {
    if (!user?.id) {
      console.log("User not found");
      return;
    }
    
    try {
      // Проверяем сроки годности и создаем уведомления о пополнении
      await checkExpiryDaily(user.id);
      
      // Загружаем лекарства
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
        sound: "default", // Звук по умолчанию
        priority: Notifications.AndroidNotificationPriority.MAX, // Максимальный приоритет
        categoryIdentifier: "medication-expiry", // Категория для группировки
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: target,
      },
    });

    Alert.alert("Уведомление установлено", "Напомню за 2 дня 👍");
  }

  // ✏️ Редактирование
  function handleEdit(item: any) {
    setEditingItem(item);
    setEditName(item.name || "");
    setEditDose(item.dose || "");
    setEditForm(item.form || "");
    // Преобразуем дату из ГГГГ-ММ-ДД в ММ.ГГГГ для отображения
    if (item.expiry) {
      try {
        const date = new Date(item.expiry);
        if (!isNaN(date.getTime())) {
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const year = date.getFullYear();
          setEditExpiry(`${month}.${year}`);
        } else {
          setEditExpiry(item.expiry);
        }
      } catch {
        setEditExpiry(item.expiry);
      }
    } else {
      setEditExpiry("");
    }
  }

  // Преобразование ММ.ГГГГ в полную дату (последний день месяца)
  const convertMonthYearToFullDate = (monthYear: string): string | null => {
    if (!monthYear || monthYear.trim() === "") return null;
    
    const cleaned = monthYear.trim().replace(/[.\-\/]/g, ".");
    const parts = cleaned.split(".");
    
    if (parts.length !== 2) {
      return monthYear.trim();
    }
    
    const month = parseInt(parts[0]);
    const year = parseInt(parts[1]);
    
    if (isNaN(month) || isNaN(year) || month < 1 || month > 12 || year < 2000 || year > 2100) {
      return monthYear.trim();
    }
    
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  };

  // 💾 Сохранение изменений
  async function handleSaveEdit() {
    if (!editingItem || !user?.id) return;
    
    if (!editName.trim()) {
      Alert.alert(t("common.error"), t("medicines.nameRequired") || "Название лекарства обязательно");
      return;
    }

    setSaving(true);
    try {
      const expiryToSave = editExpiry.trim() ? convertMonthYearToFullDate(editExpiry.trim()) : null;
      
      await updateMedicine(editingItem.id, user.id, {
        name: editName.trim(),
        dose: editDose.trim() || undefined,
        form: editForm.trim() || undefined,
        expiry: expiryToSave || undefined,
      });

      setEditingItem(null);
      loadData();
      Alert.alert(t("common.success") || "Успешно", t("medicines.updated") || "Лекарство обновлено");
    } catch (error) {
      console.error("Error updating medicine:", error);
      Alert.alert(t("common.error") || "Ошибка", t("medicines.updateError") || "Не удалось обновить лекарство");
    } finally {
      setSaving(false);
    }
  }

  // 🗑️ Удаление
  function handleDelete(id: number) {
    if (!user?.id) {
      Alert.alert("Ошибка", "Пользователь не найден");
      return;
    }

    Alert.alert("Удалить?", "Вы хотите удалить это лекарство?", [
      { text: "Отмена" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMedicine(id, user.id);
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
          <Text style={styles.info}>⌛ Годен до: {formatExpiryDate(item.expiry) || "—"}</Text>
          <Text style={styles.date}>Добавлено: {item.createdAt || "—"}</Text>

          <View style={styles.buttonsRow}>
            <TouchableOpacity style={styles.btn} onPress={() => handleNotify(item)}>
              <Text style={styles.btnText}>🔔 Напомнить</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "#4CAF50" }]}
              onPress={() => handleEdit(item)}
            >
              <Text style={styles.btnText}>✏️ Редактировать</Text>
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

      {/* Модальное окно редактирования */}
      <Modal
        visible={editingItem !== null}
        onClose={() => setEditingItem(null)}
        title={t("medicines.edit") || "Редактировать лекарство"}
        subtitle={t("medicines.editSubtitle") || "Измените информацию о лекарстве"}
        buttons={[
          {
            text: t("common.cancel") || "Отмена",
            onPress: () => setEditingItem(null),
            style: "cancel",
          },
          {
            text: t("common.save") || "Сохранить",
            onPress: handleSaveEdit,
            disabled: saving,
            loading: saving,
            style: "primary",
          },
        ]}
      >
        <View style={{ gap: 16 }}>
          <View>
            <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8, color: colors.text }}>
              {t("manual.name") || "Название"} *
            </Text>
            <ModalInput
              value={editName}
              onChangeText={setEditName}
              placeholder={t("manual.name") || "Название"}
              autoFocus
            />
          </View>

          <View>
            <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8, color: colors.text }}>
              {t("manual.dose") || "Дозировка"}
            </Text>
            <ModalInput
              value={editDose}
              onChangeText={setEditDose}
              placeholder={t("manual.dose") || "Дозировка (например 500 мг)"}
            />
          </View>

          <View>
            <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8, color: colors.text }}>
              {t("manual.form") || "Форма"}
            </Text>
            <ModalInput
              value={editForm}
              onChangeText={setEditForm}
              placeholder={t("manual.form") || "Форма (таблетки, сироп…)"}
            />
          </View>

          <View>
            <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8, color: colors.text }}>
              {t("manual.expiry") || "Срок годности"}
            </Text>
            <ExpiryDatePicker
              value={editExpiry}
              onChange={(value) => setEditExpiry(value)}
              placeholder={t("manual.expiry") || "Срок годности"}
            />
          </View>
        </View>
      </Modal>
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
