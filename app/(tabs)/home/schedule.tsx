import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  BackHandler,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getDailySchedule, markMedicineAsTaken } from "../../../src/database/medication-log.service";
import { useAuthStore } from "../../../src/store/authStore";
import { useColors } from "../../../src/theme/colors";
import { useLanguage } from "../../../src/context/LanguageContext";

export default function ScheduleScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

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

  async function loadSchedule() {
    if (!user?.id) return;

    try {
      setLoading(true);
      const data = await getDailySchedule(user.id, selectedDate);
      setSchedule(data || []);
    } catch (error) {
      console.error("Error loading schedule:", error);
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadSchedule();
    }, [user?.id, selectedDate])
  );

  async function handleMarkAsTaken(item: any) {
    if (!user?.id) return;

    Alert.alert(
      t("schedule.markAsTaken"),
      t("schedule.markAsTakenQuestion", { medicineName: item.medicineName }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.yes"),
          onPress: async () => {
            try {
              await markMedicineAsTaken({
                medicineId: item.medicineId || null,
                medicineName: item.medicineName || t("medicines.medicine"),
                reminderId: item.id,
                userId: user.id,
                scheduledTime: item.scheduledTime,
                dose: item.body || null,
              });
              await loadSchedule();
            } catch (error) {
              console.error("Error marking as taken:", error);
              Alert.alert(t("schedule.markError"), t("schedule.markErrorMessage"));
            }
          },
        },
      ]
    );
  }

  function formatTime(time: string) {
    return time;
  }

  function getTimeStatus(item: any) {
    if (item.taken) {
      return { color: colors.success, icon: "check-circle", text: t("schedule.taken") };
    }

    const now = new Date();
    const [hours, minutes] = item.scheduledTime.split(":").map(Number);
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    const timeDiff = scheduledTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff < 0) {
      return { color: colors.error, icon: "clock-alert", text: t("schedule.missed") };
    } else if (hoursDiff < 1) {
      return { color: colors.warning, icon: "clock-outline", text: t("schedule.soon") };
    } else {
      return { color: colors.textSecondary, icon: "clock", text: "Запланировано" };
    }
  }

  function renderItem({ item, isLast = false }: any) {
    const status = getTimeStatus(item);
    const itemStyles = StyleSheet.create({
      card: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: isLast ? 0 : 12,
        borderLeftWidth: 4,
        borderLeftColor: status.color,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      header: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
      },
      timeContainer: {
        width: 60,
        alignItems: "center",
        marginRight: 12,
      },
      time: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
      },
      statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
      },
      statusText: {
        fontSize: 10,
        color: status.color,
        marginLeft: 4,
      },
      content: {
        flex: 1,
      },
      medicineName: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 4,
      },
      body: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 8,
      },
      button: {
        backgroundColor: item.taken ? colors.success + "20" : colors.primary + "20",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 8,
      },
      buttonText: {
        fontSize: 14,
        fontWeight: "600",
        color: item.taken ? colors.success : colors.primary,
      },
    });

    return (
      <View style={itemStyles.card}>
        <View style={itemStyles.header}>
          <View style={itemStyles.timeContainer}>
            <Text style={itemStyles.time}>{item.scheduledTime}</Text>
            <View style={itemStyles.statusBadge}>
              <MaterialCommunityIcons name={status.icon as any} size={12} color={status.color} />
              <Text style={itemStyles.statusText}>{status.text}</Text>
            </View>
          </View>
          <View style={itemStyles.content}>
            <Text style={itemStyles.medicineName}>
              {item.medicineName || "Лекарство"}
            </Text>
            {item.body && (
              <Text style={itemStyles.body}>{item.body}</Text>
            )}
            {item.taken && item.takenAt && (
              <Text style={[itemStyles.body, { color: colors.success }]}>
                ✓ Принято в {(() => {
                  try {
                    // takenAt может быть строкой в формате SQLite datetime или ISO
                    const takenTime = typeof item.takenAt === 'string' 
                      ? new Date(item.takenAt) 
                      : new Date(item.takenAt);
                    
                    // Проверяем, что дата валидна
                    if (isNaN(takenTime.getTime())) {
                      return "неизвестно";
                    }
                    
                    return takenTime.toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                  } catch (error) {
                    console.error("Error formatting takenAt time:", error);
                    return "неизвестно";
                  }
                })()}
              </Text>
            )}
            {!item.taken && (
              <TouchableOpacity
                style={itemStyles.button}
                onPress={() => handleMarkAsTaken(item)}
              >
                <Text style={itemStyles.buttonText}>Отметить как принятое</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: insets.top + 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      flex: 1,
      textAlign: "center",
      marginHorizontal: 12,
    },
    dateSelector: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dateButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.primary + "20",
    },
    dateText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.primary,
      marginHorizontal: 8,
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
      color: colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    emptySubtext: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
    },
  });

  function changeDate(days: number) {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate.toISOString().split("T")[0]);
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateString === today.toISOString().split("T")[0]) {
      return "Сегодня";
    } else if (dateString === tomorrow.toISOString().split("T")[0]) {
      return "Завтра";
    } else if (dateString === yesterday.toISOString().split("T")[0]) {
      return "Вчера";
    } else {
      return date.toLocaleDateString("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    }
  }

  if (!user?.id) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Расписание приема</Text>
          <TouchableOpacity 
            onPress={() => router.push("/(tabs)/home/add/reminder")}
          >
            <MaterialCommunityIcons name="bell-plus" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Загрузка...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Расписание приема</Text>
        <TouchableOpacity 
          onPress={() => router.push("/(tabs)/home/add/reminder")}
        >
          <MaterialCommunityIcons name="bell-plus" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.dateSelector}>
        <TouchableOpacity onPress={() => changeDate(-1)}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.dateButton}>
          <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
        </View>
        <TouchableOpacity onPress={() => changeDate(1)}>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {schedule.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="calendar-blank" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Нет запланированных приемов</Text>
          <Text style={styles.emptySubtext}>
            На этот день не запланировано приема лекарств
          </Text>
        </View>
      ) : (
        <FlatList
          data={schedule}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={({ item, index }) => renderItem({ item, isLast: index === schedule.length - 1 })}
          contentContainerStyle={{ padding: 16, paddingBottom: 0 }}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={loadSchedule}
        />
      )}
    </View>
  );
}






