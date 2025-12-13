import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  BackHandler,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { 
  getAllRefillNotifications, 
  resolveRefillNotification, 
  deleteRefillNotification 
} from "../../../src/database/refill.service";
import { useAuthStore } from "../../../src/store/authStore";
import { useColors } from "../../../src/theme/colors";
import { useLanguage } from "../../../src/context/LanguageContext";

export default function RefillScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<any[]>([]);
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

  async function loadNotifications() {
    if (!user?.id) return;

    try {
      setLoading(true);
      const data = await getAllRefillNotifications(user.id);
      setNotifications(data || []);
    } catch (error) {
      console.error("Error loading refill notifications:", error);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [user?.id])
  );

  const handleResolve = async (id: number) => {
    try {
      await resolveRefillNotification(id);
      await loadNotifications();
      // Уведомление успешно отмечено, список обновится автоматически
    } catch (error) {
      console.error("Error resolving notification:", error);
      Alert.alert(
        t("common.error") || "Ошибка",
        t("refill.errorResolve") || "Не удалось отметить уведомление",
        [{ text: t("common.ok") || "ОК" }]
      );
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      t("refill.delete") || "Удалить уведомление?",
      t("refill.deleteMessage") || "Это действие нельзя отменить",
      [
        {
          text: t("refill.cancel") || t("common.cancel") || "Отмена",
          style: "cancel",
        },
        {
          text: t("refill.deleteConfirm") || t("common.delete") || "Удалить",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRefillNotification(id);
              await loadNotifications();
            } catch (error) {
              console.error("Error deleting notification:", error);
              Alert.alert(
                t("common.error") || "Ошибка",
                t("refill.errorDelete") || "Не удалось удалить уведомление",
                [{ text: t("common.ok") || "ОК" }]
              );
            }
          },
        },
      ]
    );
  };

  const handleAddToMedkit = (notification: any) => {
    router.push({
      pathname: "/(tabs)/home/add/manual",
      params: {
        prefillName: notification.medicineName,
        prefillDose: notification.dose || "",
      },
    });
  };

  const getReasonTypeLabel = (reasonType: string) => {
    switch (reasonType) {
      case "expired":
        return t("refill.expired") || "Просрочено";
      case "expiring":
        return t("refill.expiring") || "Скоро истекает";
      case "missing":
        return t("refill.missing") || "Отсутствует";
      case "low_stock":
        return t("refill.lowStock") || "Заканчивается";
      default:
        return reasonType;
    }
  };

  const getReasonTypeColor = (reasonType: string) => {
    switch (reasonType) {
      case "expired":
        return colors.error;
      case "expiring":
        return colors.warning;
      case "missing":
        return colors.error;
      case "low_stock":
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const getReasonTypeIcon = (reasonType: string) => {
    switch (reasonType) {
      case "expired":
        return "alert-circle";
      case "expiring":
        return "alert";
      case "missing":
        return "package-variant";
      case "low_stock":
        return "package-down";
      default:
        return "bell";
    }
  };

  const renderItem = ({ item }: any) => {
    const reasonColor = getReasonTypeColor(item.reasonType);
    const reasonIcon = getReasonTypeIcon(item.reasonType);

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
        backgroundColor: reasonColor + "20",
        borderLeftWidth: 6,
        borderLeftColor: reasonColor,
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
      cardReason: {
        fontSize: 12,
        color: reasonColor,
        fontWeight: "600",
        marginTop: 4,
      },
      cardDate: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
      },
      actionsRow: {
        flexDirection: "row",
        marginTop: 12,
        gap: 8,
      },
      actionButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
      },
      actionButtonText: {
        fontSize: 12,
        fontWeight: "600",
      },
    });

    return (
      <View style={itemStyles.card}>
        <MaterialCommunityIcons
          name={reasonIcon as any}
          size={32}
          color={reasonColor}
        />
        <View style={itemStyles.cardContent}>
          <Text style={itemStyles.cardTitle}>{item.medicineName}</Text>
          {item.dose && (
            <Text style={itemStyles.cardSubtitle}>
              {t("refill.dose") || "Дозировка"}: {item.dose}
            </Text>
          )}
          {item.reason && (
            <Text style={itemStyles.cardSubtitle}>{item.reason}</Text>
          )}
          <Text style={itemStyles.cardReason}>
            {getReasonTypeLabel(item.reasonType)}
          </Text>
          {item.createdAt && (
            <Text style={itemStyles.cardDate}>
              {new Date(item.createdAt).toLocaleDateString("ru-RU")}
            </Text>
          )}
          <View style={itemStyles.actionsRow}>
            <TouchableOpacity
              style={[
                itemStyles.actionButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => handleAddToMedkit(item)}
            >
              <Text
                style={[
                  itemStyles.actionButtonText,
                  { color: colors.white },
                ]}
              >
                {t("refill.addToMedkit") || "Добавить в аптечку"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                itemStyles.actionButton,
                { backgroundColor: colors.success },
              ]}
              onPress={() => handleResolve(item.id)}
            >
              <Text
                style={[
                  itemStyles.actionButtonText,
                  { color: colors.white },
                ]}
              >
                {t("refill.mark") || "✓ Отметить"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                itemStyles.actionButton,
                { backgroundColor: colors.error },
              ]}
              onPress={() => handleDelete(item.id)}
            >
              <MaterialCommunityIcons
                name="delete"
                size={16}
                color={colors.white}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    backButton: {
      padding: 8,
    },
    content: {
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 40,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginTop: 16,
      textAlign: "center",
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 8,
      textAlign: "center",
    },
    listContent: {
      padding: 20,
    },
  });

  if (!user?.id) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>{t("common.loading") || "Загрузка..."}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t("refill.title") || "Пополнение лекарств"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t("common.loading") || "Загрузка..."}</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="cart-off"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyText}>
            {t("refill.empty") || "Нет уведомлений о пополнении"}
          </Text>
          <Text style={styles.emptySubtext}>
            {t("refill.emptySubtext") || "Все лекарства в наличии"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => `refill-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={loadNotifications}
        />
      )}
    </View>
  );
}
