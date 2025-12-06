import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { Alert, Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../../src/store/authStore";
import { useColors } from "../../../src/theme/colors";
import { useLanguage } from "../../../src/context/LanguageContext";

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Анимации для иллюстрации
  const penAnimation = useRef(new Animated.Value(0)).current;
  const penPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const pillAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const pillPulseAnimations = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;
  const pillRotateAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const calendarFade = useRef(new Animated.Value(0)).current;
  const calendarScale = useRef(new Animated.Value(0.9)).current;
  const writingAnimation = useRef(new Animated.Value(0)).current;

  // Английские названия месяцев для иллюстрации
  const englishMonths = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    // Начальная анимация появления календаря
    Animated.parallel([
      Animated.timing(calendarFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(calendarScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Функция для создания цикла анимации записи
    const createWritingCycle = () => {
      // Сброс пилюль
      pillAnimations.forEach(anim => anim.setValue(0));
      writingAnimation.setValue(0);

      // Анимация пера - движение как при записи
      const penMoveAnim = Animated.sequence([
        // Перо появляется и движется
        Animated.parallel([
          Animated.timing(penAnimation, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(penPosition, {
            toValue: { x: -15, y: -10 },
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        // Запись первой пилюли
        Animated.parallel([
          Animated.timing(writingAnimation, {
            toValue: 0.33,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(pillAnimations[0], {
            toValue: 1,
            tension: 40,
            friction: 5,
            useNativeDriver: true,
          }),
        ]),
        // Движение пера ко второй позиции
        Animated.timing(penPosition, {
          toValue: { x: 0, y: 5 },
          duration: 400,
          useNativeDriver: true,
        }),
        // Запись второй пилюли
        Animated.parallel([
          Animated.timing(writingAnimation, {
            toValue: 0.66,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(pillAnimations[1], {
            toValue: 1,
            tension: 40,
            friction: 5,
            useNativeDriver: true,
          }),
        ]),
        // Движение пера к третьей позиции
        Animated.timing(penPosition, {
          toValue: { x: 15, y: -5 },
          duration: 400,
          useNativeDriver: true,
        }),
        // Запись третьей пилюли
        Animated.parallel([
          Animated.timing(writingAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(pillAnimations[2], {
            toValue: 1,
            tension: 40,
            friction: 5,
            useNativeDriver: true,
          }),
        ]),
        // Перо уходит
        Animated.parallel([
          Animated.timing(penAnimation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(penPosition, {
            toValue: { x: 0, y: 0 },
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        // Пауза перед следующим циклом
        Animated.delay(1500),
      ]);

      return Animated.loop(penMoveAnim);
    };

    const writingCycle = createWritingCycle();
    writingCycle.start();

    // Постоянная анимация пульсации для таблеточек
    const pulseAnims = pillPulseAnimations.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1.15,
            duration: 800 + index * 200,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 1,
            duration: 800 + index * 200,
            useNativeDriver: true,
          }),
        ])
      )
    );

    // Постоянная анимация вращения для таблеточек
    const rotateAnims = pillRotateAnimations.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000 + index * 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 2000 + index * 300,
            useNativeDriver: true,
          }),
        ])
      )
    );

    // Запускаем постоянные анимации после того, как таблеточки появились
    const startPillAnimations = () => {
      setTimeout(() => {
        pulseAnims.forEach(anim => anim.start());
        rotateAnims.forEach(anim => anim.start());
      }, 3000);
    };

    startPillAnimations();

    return () => {
      writingCycle.stop();
      pulseAnims.forEach(anim => anim.stop());
      rotateAnims.forEach(anim => anim.stop());
    };
  }, []);

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
  
  // Получаем текущую неделю (начинается с воскресенья)
  const getWeekDates = () => {
    const today = new Date(selectedDate);
    const day = today.getDay(); // 0 = воскресенье, 1 = понедельник, ..., 6 = суббота
    const diff = today.getDate() - day; // Воскресенье
    const sunday = new Date(today.setDate(diff));
    
    const week = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + i);
      week.push(date);
    }
    return week;
  };

  const weekDates = getWeekDates();
  const today = new Date();
  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
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
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    userSection: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    userAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    userAvatarPlaceholder: {
      width: 36,
      height: 36,
      justifyContent: "center",
      alignItems: "center",
    },
    userName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "500",
    },
    calendarContainer: {
      backgroundColor: colors.surface,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      borderRadius: 0,
    },
    calendarHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    monthYearText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      flex: 1,
      textAlign: "center",
    },
    daysRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 4,
    },
    dayContainer: {
      alignItems: "center",
      flex: 1,
      paddingVertical: 4,
    },
    dayName: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: "500",
      marginBottom: 6,
      textTransform: "uppercase",
    },
    dateCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "transparent",
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    dateCircleSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    dateNumber: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: "500",
    },
    dateNumberSelected: {
      color: colors.white,
      fontWeight: "700",
      fontSize: 14,
    },
    navButton: {
      padding: 4,
      borderRadius: 8,
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
    },
    calendarIllustration: {
      width: 140,
      height: 140,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 10,
      position: "relative",
      borderWidth: 2,
      borderColor: colors.primary + "40",
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    calendarHeaderIllustration: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
      paddingBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    calendarMonthText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.primary,
      letterSpacing: 0.5,
    },
    calendarGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 3,
      marginTop: 6,
    },
    calendarCell: {
      width: 18,
      height: 18,
      backgroundColor: colors.lightGray,
      borderRadius: 3,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 0.5,
      borderColor: colors.border,
    },
    pillInCell: {
      position: "absolute",
    },
    penContainer: {
      position: "absolute",
      top: 20,
      right: 20,
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
    },
    penIcon: {
      transform: [{ rotate: "-45deg" }],
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
    addButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center",
    },
    bellButton: {
      padding: 8,
      borderRadius: 20,
    },
  });

  return (
    <View style={styles.container}>
      {/* Header с пользователем */}
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
        <TouchableOpacity 
          onPress={() => router.push("/(tabs)/notifications")}
          style={styles.bellButton}
        >
          <MaterialCommunityIcons name="bell" size={24} color={colors.error} />
        </TouchableOpacity>
      </View>

      {/* Календарь - минимизированный и улучшенный */}
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => {
              const prevWeek = new Date(selectedDate);
              prevWeek.setDate(prevWeek.getDate() - 7);
              setSelectedDate(prevWeek);
            }}
          >
            <MaterialCommunityIcons name="chevron-left" size={20} color={colors.primary} />
          </TouchableOpacity>
          
          <Text style={styles.monthYearText}>
            {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
          </Text>
          
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => {
              const nextWeek = new Date(selectedDate);
              nextWeek.setDate(nextWeek.getDate() + 7);
              setSelectedDate(nextWeek);
            }}
          >
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.daysRow}>
          {dayNames.map((day, index) => {
            const date = weekDates[index];
            const isSelected = isToday(date);
            return (
              <TouchableOpacity
                key={index}
                style={styles.dayContainer}
                onPress={() => setSelectedDate(date)}
                activeOpacity={0.7}
              >
                <Text style={styles.dayName}>{day}</Text>
                <View style={[styles.dateCircle, isSelected && styles.dateCircleSelected]}>
                  <Text style={[styles.dateNumber, isSelected && styles.dateNumberSelected]}>
                    {date.getDate()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Основной контент */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Анимированная иллюстрация календаря */}
        <View style={styles.illustrationContainer}>
          <Animated.View 
            style={[
              styles.calendarIllustration,
              {
                opacity: calendarFade,
                transform: [
                  {
                    scale: calendarScale,
                  },
                ],
              },
            ]}
          >
              {/* Заголовок календаря */}
              <View style={styles.calendarHeaderIllustration}>
                <Text style={styles.calendarMonthText}>{englishMonths[today.getMonth()]}</Text>
                <MaterialCommunityIcons name="calendar" size={12} color={colors.primary} />
              </View>
              
              {/* Календарная сетка с анимированными пилюлями */}
              <View style={styles.calendarGrid}>
                {[...Array(12)].map((_, i) => {
                  const hasPill = i === 2 || i === 5 || i === 8;
                  const pillIndex = i === 2 ? 0 : i === 5 ? 1 : i === 8 ? 2 : -1;
                  const pillColor = i === 2 ? colors.error : i === 5 ? colors.primary : colors.success;
                  
                  return (
                    <View key={i} style={styles.calendarCell}>
                      {hasPill && pillIndex >= 0 && (
                        <Animated.View
                          style={[
                            styles.pillInCell,
                            {
                              opacity: pillAnimations[pillIndex],
                              transform: [
                                {
                                  scale: pillAnimations[pillIndex].interpolate({
                                    inputRange: [0, 0.5, 1],
                                    outputRange: [0, 1.2, 1.2],
                                  }),
                                },
                              ],
                            },
                          ]}
                        >
                          <Animated.View
                            style={{
                              transform: [
                                {
                                  scale: pillPulseAnimations[pillIndex],
                                },
                                {
                                  rotate: pillRotateAnimations[pillIndex].interpolate({
                                    inputRange: [0, 0.5, 1],
                                    outputRange: ["-8deg", "8deg", "-8deg"],
                                  }),
                                },
                              ],
                            }}
                          >
                            <MaterialCommunityIcons name="pill" size={14} color={pillColor} />
                          </Animated.View>
                        </Animated.View>
                      )}
                    </View>
                  );
                })}
              </View>
            </Animated.View>
            
            {/* Анимированное перо/карандаш с улучшенной анимацией */}
            <Animated.View
              style={[
                styles.penContainer,
                {
                  opacity: penAnimation.interpolate({
                    inputRange: [0, 0.3, 0.7, 1],
                    outputRange: [0, 1, 1, 0],
                  }),
                  transform: [
                    {
                      translateX: penPosition.x,
                    },
                    {
                      translateY: penPosition.y,
                    },
                    {
                      rotate: penAnimation.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: ["-45deg", "-30deg", "-45deg"],
                      }),
                    },
                    {
                      scale: penAnimation.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.8, 1.1, 0.8],
                      }),
                    },
                  ],
                },
              ]}
            >
              <MaterialCommunityIcons 
                name="pencil" 
                size={26} 
                color={colors.primary} 
                style={styles.penIcon}
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
      </ScrollView>
    </View>
  );
}
