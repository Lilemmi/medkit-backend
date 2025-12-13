import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState, useEffect } from "react";
import {
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../../../src/store/authStore";
import { useColors } from "../../../../src/theme/colors";
import { useLanguage } from "../../../../src/context/LanguageContext";
import { useTheme } from "../../../../src/context/ThemeContext";
import { getDiaryEntries, DiaryEntry } from "../../../../src/database/diary.service";

export default function DiaryScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Обработка системной кнопки "Назад"
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

  const loadEntries = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      console.log("📖 Загрузка записей дневника для userId:", user.id);
      const data = await getDiaryEntries(user.id);
      console.log("📖 Загружено записей:", data.length);
      if (data.length > 0) {
        console.log("📖 Пример записи:", data[0]);
      }
      setEntries(data);
    } catch (error) {
      console.error("❌ Ошибка загрузки записей дневника:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [user?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEntries();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t("home.today") || "Сегодня";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Вчера";
    } else {
      return date.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  };

  const groupEntriesByDate = (entries: DiaryEntry[]) => {
    const grouped: { [key: string]: DiaryEntry[] } = {};
    entries.forEach((entry) => {
      const dateKey = entry.date.split("T")[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(entry);
    });
    return grouped;
  };

  const groupedEntries = groupEntriesByDate(entries);
  const sortedDates = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a));

  const renderEntry = (entry: DiaryEntry) => {
    const getIconColor = () => {
      switch (entry.type) {
        case "symptom":
          return colors.error;
        case "mood":
          return colors.warning;
        case "activity":
          return colors.success;
        case "sleep":
          return colors.primary;
        case "doctor_visit":
          return colors.primary;
        case "lab_result":
          return colors.info || colors.primary;
        case "health_metric":
          return colors.success;
        default:
          return colors.textSecondary;
      }
    };

    return (
      <TouchableOpacity
        style={styles.entryItem}
        onPress={() => {
          // Можно добавить детальный просмотр записи
        }}
      >
        <View style={[styles.entryIcon, { backgroundColor: getIconColor() + "20" }]}>
          <MaterialCommunityIcons name={entry.icon as any} size={24} color={getIconColor()} />
        </View>
        <View style={styles.entryContent}>
          <Text style={styles.entryTitle}>{entry.title}</Text>
          {entry.subtitle && <Text style={styles.entrySubtitle}>{entry.subtitle}</Text>}
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
    content: {
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: 16,
    },
    dateSection: {
      marginTop: 24,
      marginBottom: 8,
      paddingHorizontal: 16,
    },
    dateTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 12,
    },
    entryItem: {
      backgroundColor: colors.surface,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      elevation: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowRadius: 2,
    },
    entryIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    entryContent: {
      flex: 1,
    },
    entryTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    entrySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 24,
      gap: 8,
    },
    addButtonText: {
      fontSize: 16,
      fontWeight: "600",
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("more.diary") || "Дневник"}</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t("common.loading") || "Загрузка..."}</Text>
        </View>
      ) : entries.length === 0 ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.emptyContainer}
          showsVerticalScrollIndicator={false}
        >
          <MaterialCommunityIcons name="book-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>
            {t("diary.empty") || "Нет записей в дневнике. Начните отслеживать свое здоровье!"}
          </Text>
          <Text style={[styles.emptyText, { marginTop: 16, fontSize: 14 }]}>
            {t("diary.hint") || "Добавьте записи через разделы:\n• Симптомы\n• Настроение\n• Активность\n• Сон\n• Визиты к врачу\n• Анализы\n• Метрики здоровья"}
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)/more/health")}
          >
            <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
            <Text style={[styles.addButtonText, { color: colors.white }]}>
              {t("diary.goToHealth") || "Перейти к трекерам здоровья"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {sortedDates.map((dateKey) => (
            <View key={dateKey}>
              <View style={styles.dateSection}>
                <Text style={styles.dateTitle}>{formatDate(dateKey)}</Text>
              </View>
              {groupedEntries[dateKey].map((entry) => (
                <View key={entry.id}>{renderEntry(entry)}</View>
              ))}
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

