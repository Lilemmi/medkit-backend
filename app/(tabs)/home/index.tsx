import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, usePathname, useRouter } from "expo-router";
import { useCallback, useState, useEffect, useRef } from "react";
import { Alert, Animated, BackHandler, FlatList, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LottieView from "lottie-react-native";
import { useAuthStore } from "../../../src/store/authStore";
import { useColors } from "../../../src/theme/colors";
import { useLanguage } from "../../../src/context/LanguageContext";
import { getAllReminders } from "../../../src/database/reminders.service";
import { getExpiredMedicines, getExpiringSoonMedicines } from "../../../src/database/medicine.service";
import { formatExpiryDate } from "../../../src/utils/date-formatter";
import Modal from "../../../src/components/Modal";

// Загружаем анимацию Medical Shield
const medicalShieldAnimation = require("../../../assets/animations/medical-shield.json");

export default function HomeScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t, language } = useLanguage();
  
  // Анимации для появления Lottie анимации
  const animationFade = useRef(new Animated.Value(0)).current;
  const animationScale = useRef(new Animated.Value(0.9)).current;
  
  // Состояние для модального окна уведомлений
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Убеждаемся, что при фокусе на главном экране мы действительно на главном экране
  // Если по какой-то причине мы не на главном экране, сбрасываем на главный
  useFocusEffect(
    useCallback(() => {
      const currentPath = pathname || "";
      
      // Если мы на главном экране index, но путь указывает на другой экран
      // Это может произойти при быстром переключении вкладок
      if (currentPath && 
          currentPath.includes("/(tabs)/home") && 
          currentPath !== "/(tabs)/home" &&
          currentPath !== "/(tabs)/home/" &&
          !currentPath.endsWith("/home/index") &&
          !currentPath.endsWith("/(tabs)/home/index")) {
        
        // Немедленно переходим на главный экран
        // Используем requestAnimationFrame для более плавного перехода
        // Убрана логика router.replace() - навигация управляется Tab Navigator
      }
    }, [pathname, router])
  );

  // Обработка системной кнопки "Назад" на главном экране
  // Двойное нажатие для выхода из приложения (сворачивание)
  const backPressCountRef = useRef(0);
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Проверяем, можно ли вернуться назад в навигации
        if (router.canGoBack()) {
          router.back();
          return true;
        }

        // Если нельзя вернуться назад - проверяем двойное нажатие
        const now = Date.now();
        if (backPressCountRef.current === 0 || now - backPressCountRef.current > 2000) {
          // Первое нажатие или прошло больше 2 секунд
          backPressCountRef.current = now;
          Alert.alert(
            "Выход из приложения",
            "Нажмите еще раз для выхода",
            [{ text: "Отмена" }],
            { cancelable: true }
          );
          return true;
        } else {
          // Второе нажатие в течение 2 секунд - выход из приложения
          backPressCountRef.current = 0;
          if (Platform.OS === 'android') {
            BackHandler.exitApp();
          }
          return true;
        }
      };

      const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => {
        backHandler.remove();
        backPressCountRef.current = 0;
      };
    }, [router])
  );
  
  const today = new Date();

  // Английские названия месяцев для иллюстрации
  const englishMonths = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Загрузка уведомлений
  async function loadNotifications() {
    if (!user?.id) return;

    try {
      setLoadingNotifications(true);
      const [remindersData, expiredData, expiringSoonData] = await Promise.all([
        getAllReminders(user.id),
        getExpiredMedicines(user.id),
        getExpiringSoonMedicines(user.id),
      ]);

      const formatTime = (hour: number, minute: number) => {
        const h = hour.toString().padStart(2, "0");
        const m = minute.toString().padStart(2, "0");
        return `${h}:${m}`;
      };

      const allNotifications = [
        ...expiredData.map((med: any) => ({
          id: `expired-${med.id}`,
          type: "expired",
          title: `⛔ ${t("notifications.expired") || "Просрочено"}`,
          subtitle: `${med.name} - ${t("notifications.expiredSubtitle") || "Срок годности истёк"}`,
          date: formatExpiryDate(med.expiry),
          medicine: med,
        })),
        ...expiringSoonData.map((med: any) => ({
          id: `expiring-${med.id}`,
          type: "expiring",
          title: `⚠️ ${t("notifications.expiring") || "Скоро истекает"}`,
          subtitle: `${med.name} - ${t("notifications.expiringSubtitle") || "Срок годности скоро истечёт"}`,
          date: formatExpiryDate(med.expiry),
          medicine: med,
        })),
        ...(remindersData || [])
          .filter((r: any) => r.isActive)
          .map((reminder: any) => ({
            id: `reminder-${reminder.id}`,
            type: "reminder",
            title: reminder.title,
            subtitle: reminder.medicineName
              ? `💊 ${reminder.medicineName}`
              : reminder.body || t("notifications.reminder") || "Напоминание",
            date: `${t("notifications.todayAt") || "Сегодня в"} ${formatTime(reminder.hour, reminder.minute)}`,
            reminder,
          })),
      ];

      setNotifications(allNotifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  }

  // Открытие модального окна уведомлений
  const handleNotificationsPress = async () => {
    await loadNotifications();
    setShowNotificationsModal(true);
  };

  useEffect(() => {
    // Плавное появление Lottie анимации
    Animated.parallel([
      Animated.timing(animationFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(animationScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Загружаем уведомления при фокусе на экран
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadNotifications();
      }
    }, [user?.id])
  );

  const handleUserPress = () => {
    Alert.alert(
      t("home.logoutTitle"),
      t("home.logoutConfirm"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("home.logout"),
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/(auth)/login");
          },
        },
      ]
    );
  };
  

  const dayNames = [
    t("home.days.sun"), // Воскресенье - первый день
    t("home.days.mon"),
    t("home.days.tue"),
    t("home.days.wed"),
    t("home.days.thu"),
    t("home.days.fri"),
    t("home.days.sat"),
  ];
  const monthNames = [
    t("home.months.jan"),
    t("home.months.feb"),
    t("home.months.mar"),
    t("home.months.apr"),
    t("home.months.may"),
    t("home.months.jun"),
    t("home.months.jul"),
    t("home.months.aug"),
    t("home.months.sep"),
    t("home.months.oct"),
    t("home.months.nov"),
    t("home.months.dec"),
  ];

  const formatDate = (date: Date) => {
    return `${date.getDate()} ${monthNames[date.getMonth()]}`;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingBottom: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 8,
    },
    userSection: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexShrink: 0,
      zIndex: 2,
    },
    userAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: colors.primary,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    userAvatarPlaceholder: {
      width: 36,
      height: 36,
      justifyContent: "center",
      alignItems: "center",
    },
    userName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "500",
      maxWidth: 80,
    },
    dateContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    dateText: {
      fontSize: 14,
      fontWeight: "600",
      textTransform: "capitalize",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      alignItems: "center",
      paddingTop: 40,
      paddingBottom: 100,
    },
    illustrationContainer: {
      marginBottom: 32,
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
    },
    lottieAnimation: {
      width: 200,
      height: 200,
    },
    mainTitle: {
      color: colors.text,
      fontSize: 24,
      fontWeight: "700",
      textAlign: "center",
      paddingHorizontal: 32,
      marginBottom: 12,
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 16,
      textAlign: "center",
      paddingHorizontal: 32,
      marginBottom: 32,
      lineHeight: 22,
    },
    addButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 12,
      minWidth: 280,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    prescriptionButton: {
      backgroundColor: colors.success,
      marginTop: 12,
    },
    scheduleButton: {
      backgroundColor: colors.warning,
      marginTop: 12,
    },
    addButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center",
    },
    bellButton: {
      padding: 8,
      borderRadius: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
      flexShrink: 0,
      zIndex: 2,
      position: "relative",
    },
    badge: {
      position: "absolute",
      top: 0,
      right: 0,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: colors.surface,
    },
    badgeText: {
      color: colors.white,
      fontSize: 10,
      fontWeight: "700",
    },
  });

  return (
    <View style={styles.container}>
      {/* Header с пользователем, календарем и уведомлениями */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity 
          style={styles.userSection}
          onPress={handleUserPress}
        >
          {user?.photoUri ? (
            <Image 
              source={{ uri: user.photoUri }} 
              style={styles.userAvatar}
            />
          ) : (
            <View style={styles.userAvatarPlaceholder}>
              <MaterialCommunityIcons name="account-circle" size={32} color={colors.primary} />
            </View>
          )}
          <Text style={styles.userName}>{user?.name || t("home.guest")}</Text>
        </TouchableOpacity>

        {/* Сегодняшняя дата */}
        <View style={styles.dateContainer}>
          <Text style={[styles.dateText, { color: colors.text }]}>
            {dayNames[today.getDay()]}, {today.getDate()} {monthNames[today.getMonth()]}
          </Text>
        </View>

        <TouchableOpacity 
          onPress={handleNotificationsPress}
          style={styles.bellButton}
        >
          <MaterialCommunityIcons name="bell" size={24} color={colors.error} />
          {notifications.length > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.error }]}>
              <Text style={styles.badgeText}>{notifications.length > 99 ? '99+' : notifications.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Основной контент */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Анимация Medical Shield */}
        <View style={styles.illustrationContainer}>
          <Animated.View 
            style={[
              {
                opacity: animationFade,
                transform: [
                  {
                    scale: animationScale,
                  },
                ],
              },
            ]}
          >
            <LottieView
              source={medicalShieldAnimation}
              style={styles.lottieAnimation}
              autoPlay
              loop
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* Заголовок */}
        <Text style={styles.mainTitle}>
          {t("home.subtitle")}
        </Text>

        {/* Подзаголовок */}
        <Text style={styles.subtitle}>
          {t("home.description")}
        </Text>

        {/* Кнопка добавить лекарство */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/(tabs)/home/add")}
        >
          <MaterialCommunityIcons name="pill" size={20} color={colors.white} style={{ marginRight: 8 }} />
          <Text style={styles.addButtonText}>{t("home.addMedication")}</Text>
        </TouchableOpacity>

        {/* Кнопка сканер рецептов */}
        <TouchableOpacity
          style={[styles.addButton, styles.prescriptionButton]}
          onPress={() => router.push("/(tabs)/home/add/prescription")}
        >
          <MaterialCommunityIcons name="file-document-outline" size={20} color={colors.white} style={{ marginRight: 8 }} />
          <Text style={styles.addButtonText}>{t("home.scanPrescription")}</Text>
        </TouchableOpacity>

        {/* Кнопка расписание приема */}
        <TouchableOpacity
          style={[styles.addButton, styles.scheduleButton]}
          onPress={() => router.push("/(tabs)/home/schedule")}
        >
          <MaterialCommunityIcons name="calendar-clock" size={20} color={colors.white} style={{ marginRight: 8 }} />
          <Text style={styles.addButtonText}>{t("home.schedule")}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Модальное окно уведомлений */}
      <Modal
        visible={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        title={t("notifications.title") || "Уведомления"}
        showCloseButton={true}
      >
        {/* Кнопка добавления напоминания в header модального окна */}
        <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => {
              setShowNotificationsModal(false);
              router.push("/(tabs)/home/add/reminder");
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.primary + "20",
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 8,
            }}
          >
            <MaterialCommunityIcons name="bell-plus" size={20} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: "600", marginLeft: 8, fontSize: 14 }}>
              {t("reminders.create") || "Добавить напоминание"}
            </Text>
          </TouchableOpacity>
        </View>

        {loadingNotifications ? (
          <View style={{ padding: 20, alignItems: "center" }}>
            <Text style={{ color: colors.textSecondary }}>Загрузка...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={{ padding: 20, alignItems: "center" }}>
            <MaterialCommunityIcons name="bell-off" size={48} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16 }}>
              {t("notifications.empty") || "Нет уведомлений"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isExpired = item.type === "expired";
              const isExpiring = item.type === "expiring";
              const isReminder = item.type === "reminder";

              return (
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    alignItems: "center",
                    backgroundColor: isExpired
                      ? colors.error + "20"
                      : isExpiring
                      ? colors.warning + "20"
                      : colors.primary + "20",
                    borderLeftWidth: 4,
                    borderLeftColor: isExpired
                      ? colors.error
                      : isExpiring
                      ? colors.warning
                      : colors.primary,
                  }}
                  onPress={() => {
                    setShowNotificationsModal(false);
                    if (item.medicine) {
                      router.push(`/(tabs)/home/medicine/${item.medicine.id}`);
                    } else if (item.reminder) {
                      // Переход на расписание для просмотра напоминаний
                      router.push("/(tabs)/home/schedule");
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
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4 }}>
                      {item.title}
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 2 }}>
                      {item.subtitle}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                      {item.date}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            style={{ maxHeight: 400 }}
            contentContainerStyle={{ padding: 8 }}
          />
        )}
      </Modal>
    </View>
  );
}
