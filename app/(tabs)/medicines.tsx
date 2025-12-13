import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState, useEffect } from "react";
import {
  Alert,
  BackHandler,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  deleteMedicine,
  getAllMedicines,
} from "../../src/database/medicine.service";
import { useAuthStore } from "../../src/store/authStore";
import { useColors } from "../../src/theme/colors";
import { useLanguage } from "../../src/context/LanguageContext";
import { formatExpiryDate } from "../../src/utils/date-formatter";
import type { MedicineRow } from "../../src/types/db";

// 🔔 Просим доступ к уведомлениям
async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    console.log("Notifications disabled");
  }
}

export default function MedicinesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();
  const [items, setItems] = useState<MedicineRow[]>([]);

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

  // Убрана логика router.replace() - навигация управляется Tab Navigator
  // При переключении вкладок Tab Navigator сам управляет стеком

  // Обработка системной кнопки "Назад" на вкладке "Аптечка"
  // При нажатии переходим на вкладку "Главная"
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Проверяем, можно ли вернуться назад в навигации
        if (router.canGoBack()) {
          router.back();
          return true;
        }
        
        // Корневой экран вкладки - стандартное поведение Android (не обрабатываем)
        return false;
      };

      const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => backHandler.remove();
    }, [router])
  );

  // 🔔 Настройка напоминания
  async function handleNotify(item: any) {
    if (!item.expiry) {
      Alert.alert(t("medicines.noExpiry"), t("medicines.noExpiryMessage"));
      return;
    }

    const target = new Date(item.expiry);
    target.setDate(target.getDate() - 2);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `⚠️ ${t("notifications.expiring")}`,
        body: `${item.name} (${item.dose || ""}) ${t("medicines.expiry")} ${item.expiry}`,
        sound: "default", // Звук по умолчанию
        priority: Notifications.AndroidNotificationPriority.MAX, // Максимальный приоритет
        categoryIdentifier: "medication-expiry", // Категория для группировки
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: target,
      },
    });

    Alert.alert(t("medicines.notificationSet"), t("medicines.notificationMessage"));
  }

  // 🗑️ Удаление
  function handleDelete(id: number) {
    if (!user?.id) {
      Alert.alert(t("common.error"), t("scan.userNotFound"));
      return;
    }

    Alert.alert(t("medicines.deleteConfirm"), t("medicines.deleteQuestion"), [
      { text: t("common.cancel") },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMedicine(id, user.id);
            loadData();
          } catch (error) {
            console.error("Error deleting medicine:", error);
            Alert.alert(t("common.error"), t("medicines.deleteError"));
          }
        },
      },
    ]);
  }

  // 🎨 Один элемент списка
  function renderItem({ item }: any) {
    const itemStyles = StyleSheet.create({
      card: {
        flexDirection: "row",
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
      },
      photo: {
        width: 90,
        height: 90,
        borderRadius: 10,
        marginRight: 12,
        backgroundColor: colors.lightGray,
      },
      name: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 4,
        color: colors.text,
      },
      info: {
        marginTop: 2,
        fontSize: 14,
        color: colors.textSecondary,
      },
      date: {
        marginTop: 4,
        fontSize: 12,
        color: colors.textSecondary,
      },
      buttonsRow: {
        marginTop: 10,
        flexDirection: "row",
        gap: 10,
      },
      btn: {
        backgroundColor: colors.primary,
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 8,
      },
      btnDelete: {
        backgroundColor: colors.error,
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 8,
      },
      btnText: {
        color: colors.white,
        fontWeight: "600",
        fontSize: 14,
      },
    });

    return (
      <TouchableOpacity
        style={itemStyles.card}
        onPress={() => router.push(`/(tabs)/home/medicine/${item.id}`)}
      >
                    {/* Показываем фото - локальное или из интернета */}
                    {(() => {
                      // Если есть photoUri (локальное или из интернета)
                      if (item.photoUri && item.photoUri.trim() !== '') {
                        const photoUri = String(item.photoUri).trim();
                        
                        // Пропускаем невалидные локальные пути (file://, content://) которые могут быть с другого устройства
                        // Используем только URL из интернета (http://, https://) или локальные пути с medicine_photos/
                        // Также пропускаем пути без medicine_photos/, так как они могут быть невалидными после синхронизации
                        if ((photoUri.startsWith('file://') || photoUri.startsWith('content://')) && 
                            !photoUri.includes('medicine_photos/')) {
                          // Это может быть путь с другого устройства - пропускаем
                          return null;
                        }
                        
                        // Для Android: если URI начинается с /storage/, добавляем file://
                        let finalUri = photoUri;
                        if (Platform.OS === 'android' && photoUri.startsWith('/storage/')) {
                          finalUri = `file://${photoUri}`;
                        }
                        
                        return (
                          <Image
                            source={{ uri: finalUri }}
                            style={itemStyles.photo}
                            resizeMode="cover"
                            onError={(error) => {
                              console.log(`Ошибка загрузки фото для лекарства ${item.id}:`, error.nativeEvent?.error || error);
                              console.log(`Попытка загрузить URI: ${finalUri}`);
                            }}
                            onLoad={() => {
                              console.log(`Фото загружено для лекарства ${item.id}:`, finalUri);
                            }}
                          />
                        );
                      }
                      // Если нет фото - показываем placeholder
                      return (
                        <View style={[itemStyles.photo, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.lightGray }]}>
                          <MaterialCommunityIcons name="pill" size={40} color={colors.textSecondary} />
                        </View>
                      );
                    })()}

        <View style={{ flex: 1 }}>
          <Text style={itemStyles.name}>{item.name || t("scan.notSpecified")}</Text>
          {item.userDosage ? (
            <Text style={[itemStyles.info, { color: colors?.primary || "#4A90E2", fontWeight: "600" }]}>
              💉 {t("medicines.dosage")} {item.userDosage}
            </Text>
          ) : (
            <Text style={itemStyles.info}>💊 {t("medicines.dosage")} {item.dose || "—"}</Text>
          )}
          <Text style={itemStyles.info}>🧪 {t("medicines.form")} {item.form || "—"}</Text>
          <Text style={itemStyles.info}>⌛ {t("medicines.expiry")} {formatExpiryDate(item.expiry) || "—"}</Text>
          <Text style={itemStyles.date}>{t("medicines.added")} {item.createdAt || "—"}</Text>

          <View style={itemStyles.buttonsRow}>
            <TouchableOpacity style={itemStyles.btn} onPress={() => handleNotify(item)}>
              <Text style={itemStyles.btnText}>🔔 {t("medicines.remind")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={itemStyles.btnDelete}
              onPress={() => handleDelete(item.id)}
            >
              <Text style={itemStyles.btnText}>{t("common.delete")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
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
      paddingHorizontal: 16,
      paddingBottom: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    emptyText: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 16,
      color: colors.textSecondary,
    },
  });

  if (!user?.id) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <MaterialCommunityIcons name="pill-multiple" size={28} color={colors.primary} />
          <Text style={styles.headerTitle}>{t("tabs.medicines")}</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t("common.loading")}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <MaterialCommunityIcons name="pill-multiple" size={28} color={colors.primary} />
        <Text style={styles.headerTitle}>{t("tabs.medicines")}</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t("medicines.empty")}</Text>
          <Text style={styles.emptySubtext}>{t("medicines.emptySubtext")}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

