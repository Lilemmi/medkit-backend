import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  BackHandler,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  createReminder,
  deleteReminder,
  getAllReminders,
  toggleReminder,
} from "../../../../src/database/reminders.service";
import { getAllMedicines } from "../../../../src/database/medicine.service";
import { useAuthStore } from "../../../../src/store/authStore";
import { useColors } from "../../../../src/theme/colors";
import { useLanguage } from "../../../../src/context/LanguageContext";

export default function RemindersScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();
  const [reminders, setReminders] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

  async function loadData() {
    if (!user?.id) return;

    try {
      setLoading(true);
      const [remindersData, medicinesData] = await Promise.all([
        getAllReminders(user.id),
        getAllMedicines(user.id),
      ]);
      setReminders(remindersData || []);
      setMedicines(medicinesData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user?.id])
  );

  const handleToggle = async (id: number, currentValue: boolean) => {
    try {
      await toggleReminder(id, !currentValue);
      loadData();
    } catch (error) {
      console.error("Error toggling reminder:", error);
      Alert.alert("Ошибка", "Не удалось изменить статус напоминания");
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert("Удалить напоминание?", "Вы уверены, что хотите удалить это напоминание?", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteReminder(id);
            loadData();
          } catch (error) {
            console.error("Error deleting reminder:", error);
            Alert.alert("Ошибка", "Не удалось удалить напоминание");
          }
        },
      },
    ]);
  };

  const formatTime = (hour: number, minute: number) => {
    const h = hour.toString().padStart(2, "0");
    const m = minute.toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  const formatDays = (daysOfWeek: number[] | null) => {
    if (!daysOfWeek || daysOfWeek.length === 0) return "Каждый день";
    
    const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    if (daysOfWeek.length === 7) return "Каждый день";
    return daysOfWeek.map((d) => dayNames[d]).join(", ");
  };

  const renderItem = ({ item }: any) => {
    return (
      <View style={[styles.card, !item.isActive && styles.cardInactive]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <MaterialCommunityIcons
              name={item.isActive ? "bell" : "bell-off"}
              size={24}
              color={item.isActive ? "#4A90E2" : "#999"}
            />
            <View style={styles.cardTitleContainer}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.medicineName && (
                <Text style={styles.cardSubtitle}>💊 {item.medicineName}</Text>
              )}
            </View>
          </View>
          <Switch
            value={item.isActive}
            onValueChange={() => handleToggle(item.id, item.isActive)}
            trackColor={{ false: "#ccc", true: "#4A90E2" }}
          />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardInfoRow}>
            <MaterialCommunityIcons name="clock-outline" size={18} color="#666" />
            <Text style={styles.cardInfoText}>
              {formatTime(item.hour, item.minute)} • {formatDays(item.daysOfWeek)}
            </Text>
          </View>
          {item.body && (
            <Text style={styles.cardBodyText}>{item.body}</Text>
          )}
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push(`/(tabs)/home/add/reminder?reminderId=${item.id}`)}
          >
            <MaterialCommunityIcons name="pencil-outline" size={20} color="#4A90E2" />
            <Text style={styles.editButtonText}>Редактировать</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id)}
          >
            <MaterialCommunityIcons name="delete-outline" size={20} color="#FF6B6B" />
            <Text style={styles.deleteButtonText}>Удалить</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!user?.id) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { flex: 1, textAlign: "center" }]}>{t("reminders.title") || "Напоминания"}</Text>
        <View style={{ width: 24 }} />
      </View>

      {reminders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="bell-off" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Нет напоминаний</Text>
          <Text style={styles.emptySubtext}>
            Создайте напоминание для приема лекарств
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              // Показываем диалог для создания напоминания
              Alert.prompt(
                "Новое напоминание",
                "Введите название напоминания",
                [
                  { text: "Отмена", style: "cancel" },
                  {
                    text: "Создать",
                    onPress: async (title?: string) => {
                      if (!title || !title.trim()) return;
                      
                      // Простое напоминание на каждый день в 9:00
                      try {
                        await createReminder({
                          title: title.trim(),
                          hour: 9,
                          minute: 0,
                          userId: user.id,
                        });
                        loadData();
                      } catch (error) {
                        console.error("Error creating reminder:", error);
                        Alert.alert("Ошибка", "Не удалось создать напоминание");
                      }
                    },
                  },
                ],
                "plain-text"
              );
            }}
          >
            <Text style={styles.addButtonText}>+ Создать напоминание</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              router.push("/(tabs)/home/add/reminder");
            }}
          >
            <MaterialCommunityIcons name="plus-circle" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Добавить напоминание</Text>
          </TouchableOpacity>

          <FlatList
            data={reminders}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshing={loading}
            onRefresh={loadData}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8FF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E6ED",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: "#4A90E2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    margin: 16,
    gap: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardInactive: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  cardTitleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C3E50",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  cardBody: {
    marginTop: 8,
  },
  cardInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  cardInfoText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  cardBodyText: {
    fontSize: 14,
    color: "#333",
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    gap: 12,
    minHeight: 50,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4A90E220",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minHeight: 44,
  },
  editButtonText: {
    color: "#4A90E2",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  deleteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B6B20",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minHeight: 44,
  },
  deleteButtonText: {
    color: "#FF6B6B",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
});










