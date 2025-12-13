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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAllReminders } from "../../../../src/database/reminders.service";
import { getExpiredMedicines, getExpiringSoonMedicines } from "../../../../src/database/medicine.service";
import { useAuthStore } from "../../../../src/store/authStore";
import { useColors } from "../../../../src/theme/colors";
import { useLanguage } from "../../../../src/context/LanguageContext";
import { formatExpiryDate } from "../../../../src/utils/date-formatter";

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t, language } = useLanguage();
  const [reminders, setReminders] = useState<any[]>([]);
  const [expired, setExpired] = useState<any[]>([]);
  const [expiringSoon, setExpiringSoon] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Обработка системной кнопки "Назад" (Android)
  // Возвращаемся на предыдущий экран внутри вкладки "Больше"
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
      const [remindersData, expiredData, expiringSoonData] = await Promise.all([
        getAllReminders(user.id),
        getExpiredMedicines(user.id),
        getExpiringSoonMedicines(user.id),
      ]);
      setReminders(remindersData || []);
      setExpired(expiredData || []);
      setExpiringSoon(expiringSoonData || []);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user?.id])
  );

  const formatTime = (hour: number, minute: number) => {
    const h = hour.toString().padStart(2, "0");
    const m = minute.toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  const formatDateOld = (dateString: string) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      const locale = language === "ru" ? "ru-RU" : language === "he" ? "he-IL" : "en-US";
      return date.toLocaleDateString(locale);
    } catch {
      return dateString;
    }
  };

  const allNotifications = [
    ...expired.map((med) => ({
      id: `expired-${med.id}`,
      type: "expired",
      title: `⛔ ${t("notifications.expired")}`,
      subtitle: `${med.name} - ${t("notifications.expiredSubtitle")}`,
      date: formatExpiryDate(med.expiry),
      medicine: med,
    })),
    ...expiringSoon.map((med) => ({
      id: `expiring-${med.id}`,
      type: "expiring",
      title: `⚠️ ${t("notifications.expiring")}`,
      subtitle: `${med.name} - ${t("notifications.expiringSubtitle")}`,
      date: formatExpiryDate(med.expiry),
      medicine: med,
    })),
    ...reminders
      .filter((r) => r.isActive)
      .map((reminder) => ({
        id: `reminder-${reminder.id}`,
        type: "reminder",
        title: reminder.title,
        subtitle: reminder.medicineName
          ? `💊 ${reminder.medicineName}`
          : reminder.body || t("notifications.reminder"),
        date: `${t("notifications.todayAt")} ${formatTime(reminder.hour, reminder.minute)}`,
        reminder,
      })),
  ];

  const renderItem = ({ item }: any) => {
    const isExpired = item.type === "expired";
    const isExpiring = item.type === "expiring";
    const isReminder = item.type === "reminder";

    const itemStyles = StyleSheet.create({
      card: {
        flexDirection: "row",
        padding: 16,
        borderRadius: 12,
        marginBottom: 14,
        alignItems: "center",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      cardExpired: {
        backgroundColor: colors.error + "20",
        borderLeftWidth: 6,
        borderLeftColor: colors.error,
      },
      cardExpiring: {
        backgroundColor: colors.warning + "20",
        borderLeftWidth: 6,
        borderLeftColor: colors.warning,
      },
      cardReminder: {
        backgroundColor: colors.primary + "20",
        borderLeftWidth: 6,
        borderLeftColor: colors.primary,
      },
      cardContent: {
        marginLeft: 12,
        flex: 1,
      },
      cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 4,
      },
      cardSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 2,
      },
      cardDate: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
      },
    });

    return (
      <TouchableOpacity
        style={[
          itemStyles.card,
          isExpired && itemStyles.cardExpired,
          isExpiring && itemStyles.cardExpiring,
          isReminder && itemStyles.cardReminder,
        ]}
        onPress={() => {
          if (item.medicine) {
            router.push(`/(tabs)/home/medicine/${item.medicine.id}`);
          } else if (item.reminder) {
            router.push("/(tabs)/more/notifications/reminders");
          }
        }}
      >
        <MaterialCommunityIcons
          name={
            isExpired
              ? "alert-circle"
              : isExpiring
              ? "alert"
              : "bell"
          }
          size={32}
          color={
            isExpired
              ? colors.error
              : isExpiring
              ? colors.warning
              : colors.primary
          }
        />
        <View style={itemStyles.cardContent}>
          <Text style={itemStyles.cardTitle}>{item.title}</Text>
          <Text style={itemStyles.cardSubtitle}>{item.subtitle}</Text>
          <Text style={itemStyles.cardDate}>{item.date}</Text>
        </View>
      </TouchableOpacity>
    );
  };

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
      paddingBottom: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    manageRemindersButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      padding: 16,
      margin: 16,
      borderRadius: 12,
      gap: 8,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    manageRemindersButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
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
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
    },
    listContent: {
      padding: 20,
    },
  });

  if (!user?.id) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>{t("common.loading")}</Text>
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
        <Text style={[styles.headerTitle, { flex: 1, textAlign: "center" }]}>{t("tabs.notifications") || "Уведомления"}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Кнопка управления напоминаниями */}
      <TouchableOpacity
        style={styles.manageRemindersButton}
        onPress={() => router.push("/(tabs)/more/notifications/reminders")}
      >
        <MaterialCommunityIcons name="bell-plus" size={24} color={colors.white} />
        <Text style={styles.manageRemindersButtonText}>{t("notifications.manageReminders")}</Text>
      </TouchableOpacity>

      {allNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="bell-off" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>{t("notifications.empty")}</Text>
          <Text style={styles.emptySubtext}>
            {t("notifications.emptySubtext")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={allNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={loadData}
        />
      )}
    </View>
  );
}
