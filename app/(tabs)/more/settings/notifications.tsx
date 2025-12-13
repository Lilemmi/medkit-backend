import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState, useEffect } from "react";
import { Alert, BackHandler, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../../../../src/theme/colors";
import { useLanguage } from "../../../../src/context/LanguageContext";
import * as SecureStore from "expo-secure-store";

const NOTIFICATION_SETTINGS_KEY = "notification_settings";

interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  lightsEnabled: boolean;
  badgeEnabled: boolean;
  lockscreenVisible: boolean;
  repeatEnabled: boolean; // Включить повторяющиеся уведомления
  repeatInterval: number; // Интервал повторения в минутах
  repeatCount: number; // Количество повторений
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  lightsEnabled: true,
  badgeEnabled: true,
  lockscreenVisible: true,
  repeatEnabled: true,
  repeatInterval: 5,
  repeatCount: 12,
};

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();
  
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<string>("");

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

  useEffect(() => {
    loadSettings();
    checkPermissions();
  }, []);

  async function loadSettings() {
    try {
      const saved = await SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error("Error loading notification settings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(newSettings: NotificationSettings) {
    try {
      await SecureStore.setItemAsync(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
      await applySettings(newSettings);
    } catch (error) {
      console.error("Error saving notification settings:", error);
      Alert.alert(t("common.error"), t("settings.notificationSaveError") || "Не удалось сохранить настройки");
    }
  }

  async function checkPermissions() {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === "granted") {
        setPermissionStatus(t("settings.notificationsGranted") || "Разрешение предоставлено");
      } else if (status === "denied") {
        setPermissionStatus(t("settings.notificationsDenied") || "Разрешение отклонено");
      } else {
        setPermissionStatus(t("settings.notificationsNotRequested") || "Разрешение не запрошено");
      }
    } catch (error) {
      console.error("Error checking permissions:", error);
    }
  }

  async function requestPermissions() {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      await checkPermissions();
      if (status !== "granted") {
        Alert.alert(
          t("settings.notificationPermissionTitle") || "Разрешение на уведомления",
          t("settings.notificationPermissionMessage") || "Для работы уведомлений необходимо предоставить разрешение в настройках устройства"
        );
      }
    } catch (error) {
      console.error("Error requesting permissions:", error);
    }
  }

  async function applySettings(newSettings: NotificationSettings) {
    try {
      // Обновляем обработчик уведомлений
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          // Для критических уведомлений о лекарствах всегда показываем, даже при выключенном звуке
          const isMedicationReminder = 
            notification.request.content.categoryIdentifier === "medication-reminder" ||
            notification.request.content.categoryIdentifier === "medication-reminders" ||
            notification.request.content.categoryIdentifier === "medication-alert" ||
            notification.request.content.categoryIdentifier === "medication-expiry" ||
            notification.request.content.categoryIdentifier === "medication-expired" ||
            notification.request.content.categoryIdentifier === "medication-stock";
          
          return {
            shouldPlaySound: isMedicationReminder ? true : (newSettings.soundEnabled && newSettings.enabled), // Звук ВСЕГДА включен для лекарств
            shouldSetBadge: newSettings.badgeEnabled && newSettings.enabled,
            shouldShowBanner: newSettings.enabled || isMedicationReminder,
            shouldShowList: newSettings.enabled || isMedicationReminder,
          };
        },
      });

      // Обновляем все каналы для Android через функцию из utils
      if (Platform.OS === "android") {
        const { setupNotificationChannel } = await import("../../../../src/utils/notifications");
        await setupNotificationChannel(newSettings);
      }
    } catch (error) {
      console.error("Error applying notification settings:", error);
      Alert.alert(
        t("common.error") || "Ошибка",
        t("settings.notificationSaveError") || "Не удалось применить настройки уведомлений"
      );
    }
  }

  const handleToggle = async (key: keyof NotificationSettings, value: boolean | number) => {
    const newSettings = { ...settings, [key]: value };
    await saveSettings(newSettings);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      position: "relative",
      zIndex: 10,
      elevation: 2, // Для Android тень
      shadowColor: "#000", // Для iOS тень
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    contentContainer: {
      paddingBottom: 40,
    },
    sectionTitleWrapper: {
      marginTop: 20,
      marginBottom: 8,
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    itemRow: {
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 16,
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      elevation: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    itemRowContent: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    itemIcon: {
      marginRight: 12,
    },
    itemTextContainer: {
      flex: 1,
    },
    itemText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: "500",
    },
    itemSubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    permissionStatus: {
      backgroundColor: colors.surface,
      padding: 16,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    permissionStatusText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
    },
    permissionButton: {
      backgroundColor: colors.primary,
      padding: 12,
      marginHorizontal: 16,
      marginTop: 8,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
    },
    permissionButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
    },
    repeatSettingsCard: {
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 16,
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    repeatSettingsHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    repeatButtonsContainer: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 4,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border + "40",
    },
    intervalButton: {
      minWidth: 48,
      maxWidth: 60,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.lightGray || colors.border + "40",
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    intervalButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    intervalButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    intervalButtonTextActive: {
      color: colors.white,
    },
    intervalLabel: {
      color: colors.textSecondary,
      fontSize: 14,
      marginLeft: 4,
      fontWeight: "500",
    },
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.itemText}>{t("common.loading")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header - фиксированный, вне ScrollView */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={{ position: "absolute", left: 16, zIndex: 1, padding: 8 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("settings.notificationSettings") || "Настройки уведомлений"}</Text>
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Разрешения */}
      <View style={styles.permissionStatus}>
        <Text style={styles.permissionStatusText}>
          {t("settings.notificationPermissionStatus") || "Статус разрешений"}: {permissionStatus}
        </Text>
      </View>
      <TouchableOpacity style={styles.permissionButton} onPress={requestPermissions}>
        <Text style={styles.permissionButtonText}>
          {t("settings.requestNotificationPermission") || "Запросить разрешение"}
        </Text>
      </TouchableOpacity>

      {/* Основные настройки */}
      <View style={styles.sectionTitleWrapper}>
        <Text style={styles.sectionTitle}>{t("settings.generalSettings") || "Основные настройки"}</Text>
      </View>

      <View style={styles.itemRow}>
        <View style={styles.itemRowContent}>
          <MaterialCommunityIcons name="bell" size={24} color={colors.primary} style={styles.itemIcon} />
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemText}>{t("settings.enableNotifications") || "Включить уведомления"}</Text>
            <Text style={styles.itemSubtext}>
              {t("settings.enableNotificationsDescription") || "Разрешить приложению отправлять уведомления"}
            </Text>
          </View>
        </View>
        <Switch 
          value={settings.enabled} 
          onValueChange={(value) => handleToggle("enabled", value)}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.white}
        />
      </View>

      {/* Настройки звука и вибрации */}
      <View style={styles.sectionTitleWrapper}>
        <Text style={styles.sectionTitle}>{t("settings.soundAndVibration") || "Звук и вибрация"}</Text>
      </View>

      <View style={styles.itemRow}>
        <View style={styles.itemRowContent}>
          <MaterialCommunityIcons name="volume-high" size={24} color={colors.primary} style={styles.itemIcon} />
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemText}>{t("settings.enableSound") || "Включить звук"}</Text>
            <Text style={styles.itemSubtext}>
              {t("settings.enableSoundDescription") || "Воспроизводить звук при получении уведомлений. Для уведомлений о лекарствах звук всегда включен (вибрация и свет работают всегда)"}
            </Text>
          </View>
        </View>
        <Switch 
          value={settings.soundEnabled && settings.enabled} 
          onValueChange={(value) => handleToggle("soundEnabled", value)}
          disabled={!settings.enabled}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.white}
        />
      </View>

      <View style={styles.itemRow}>
        <View style={styles.itemRowContent}>
          <MaterialCommunityIcons name="vibrate" size={24} color={colors.primary} style={styles.itemIcon} />
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemText}>{t("settings.enableVibration") || "Включить вибрацию"}</Text>
            <Text style={styles.itemSubtext}>
              {t("settings.enableVibrationDescription") || "Вибрация при получении уведомлений (всегда включена для лекарств)"}
            </Text>
          </View>
        </View>
        <Switch 
          value={settings.vibrationEnabled && settings.enabled} 
          onValueChange={(value) => handleToggle("vibrationEnabled", value)}
          disabled={!settings.enabled}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.white}
        />
      </View>

      {Platform.OS === "android" && (
        <View style={styles.itemRow}>
          <View style={styles.itemRowContent}>
            <MaterialCommunityIcons name="lightbulb" size={24} color={colors.primary} style={styles.itemIcon} />
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemText}>{t("settings.enableLights") || "Включить светодиод"}</Text>
              <Text style={styles.itemSubtext}>
                {t("settings.enableLightsDescription") || "Мигание светодиода при уведомлениях (всегда включен для лекарств)"}
              </Text>
            </View>
          </View>
          <Switch 
            value={settings.lightsEnabled && settings.enabled} 
            onValueChange={(value) => handleToggle("lightsEnabled", value)}
            disabled={!settings.enabled}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      )}

      {/* Настройки повторения уведомлений */}
      <View style={styles.sectionTitleWrapper}>
        <Text style={styles.sectionTitle}>{t("settings.repeatSettings") || "Повторяющиеся уведомления"}</Text>
      </View>

      <View style={styles.itemRow}>
        <View style={styles.itemRowContent}>
          <MaterialCommunityIcons name="repeat" size={24} color={colors.primary} style={styles.itemIcon} />
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemText}>{t("settings.enableRepeat") || "Включить повторения"}</Text>
            <Text style={styles.itemSubtext}>
              {t("settings.enableRepeatDescription") || "Повторять уведомления пока не подтвердите прием лекарства"}
            </Text>
          </View>
        </View>
        <Switch 
          value={settings.repeatEnabled && settings.enabled} 
          onValueChange={(value) => handleToggle("repeatEnabled", value)}
          disabled={!settings.enabled}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.white}
        />
      </View>

      {settings.repeatEnabled && settings.enabled && (
        <>
          {/* Интервал повторения */}
          <View style={styles.repeatSettingsCard}>
            <View style={styles.repeatSettingsHeader}>
              <MaterialCommunityIcons name="timer-outline" size={24} color={colors.primary} style={styles.itemIcon} />
              <View style={styles.itemTextContainer}>
                <Text style={styles.itemText}>{t("settings.repeatInterval") || "Интервал повторения"}</Text>
                <Text style={styles.itemSubtext}>
                  {t("settings.repeatIntervalDescription") || "Как часто повторять уведомление"}
                </Text>
              </View>
            </View>
            <View style={styles.repeatButtonsContainer}>
              {[1, 2, 3, 5, 10, 15, 20, 30, 60].map((interval) => (
                <TouchableOpacity
                  key={interval}
                  onPress={() => handleToggle("repeatInterval", interval)}
                  style={[
                    styles.intervalButton,
                    settings.repeatInterval === interval && styles.intervalButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.intervalButtonText,
                      settings.repeatInterval === interval && styles.intervalButtonTextActive,
                    ]}
                  >
                    {interval}
                  </Text>
                </TouchableOpacity>
              ))}
              <Text style={styles.intervalLabel}>
                {t("settings.minutes") || "мин"}
              </Text>
            </View>
          </View>

          {/* Количество повторений */}
          <View style={styles.repeatSettingsCard}>
            <View style={styles.repeatSettingsHeader}>
              <MaterialCommunityIcons name="numeric" size={24} color={colors.primary} style={styles.itemIcon} />
              <View style={styles.itemTextContainer}>
                <Text style={styles.itemText}>{t("settings.repeatCount") || "Количество повторений"}</Text>
                <Text style={styles.itemSubtext}>
                  {t("settings.repeatCountDescription") || "Максимальное количество повторений"}
                </Text>
              </View>
            </View>
            <View style={styles.repeatButtonsContainer}>
              {[6, 12, 18, 24].map((count) => (
                <TouchableOpacity
                  key={count}
                  onPress={() => handleToggle("repeatCount", count)}
                  style={[
                    styles.intervalButton,
                    settings.repeatCount === count && styles.intervalButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.intervalButtonText,
                      settings.repeatCount === count && styles.intervalButtonTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      )}

      {/* Дополнительные настройки */}
      <View style={styles.sectionTitleWrapper}>
        <Text style={styles.sectionTitle}>{t("settings.additionalSettings") || "Дополнительные настройки"}</Text>
      </View>

      <View style={styles.itemRow}>
        <View style={styles.itemRowContent}>
          <MaterialCommunityIcons name="numeric" size={24} color={colors.primary} style={styles.itemIcon} />
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemText}>{t("settings.enableBadge") || "Показывать бейдж"}</Text>
            <Text style={styles.itemSubtext}>
              {t("settings.enableBadgeDescription") || "Отображать количество непрочитанных уведомлений на иконке"}
            </Text>
          </View>
        </View>
        <Switch 
          value={settings.badgeEnabled && settings.enabled} 
          onValueChange={(value) => handleToggle("badgeEnabled", value)}
          disabled={!settings.enabled}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.white}
        />
      </View>

      {Platform.OS === "android" && (
        <View style={styles.itemRow}>
          <View style={styles.itemRowContent}>
            <MaterialCommunityIcons name="lock" size={24} color={colors.primary} style={styles.itemIcon} />
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemText}>{t("settings.showOnLockScreen") || "Показывать на заблокированном экране"}</Text>
              <Text style={styles.itemSubtext}>
                {t("settings.showOnLockScreenDescription") || "Отображать уведомления на экране блокировки (всегда включено для лекарств)"}
              </Text>
            </View>
          </View>
          <Switch 
            value={settings.lockscreenVisible && settings.enabled} 
            onValueChange={(value) => handleToggle("lockscreenVisible", value)}
            disabled={!settings.enabled}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      )}

      {/* Тестовое уведомление */}
      <View style={styles.sectionTitleWrapper}>
        <Text style={styles.sectionTitle}>{t("settings.testNotification") || "Тестирование"}</Text>
      </View>

      <TouchableOpacity 
        style={[styles.permissionButton, { backgroundColor: colors.success || colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center" }]} 
        onPress={async () => {
          try {
            const { status } = await Notifications.getPermissionsAsync();
            if (status !== "granted") {
              Alert.alert(
                t("settings.notificationPermissionTitle") || "Разрешение на уведомления",
                t("settings.notificationPermissionMessage") || "Для тестирования уведомлений необходимо предоставить разрешение"
              );
              return;
            }

            await Notifications.scheduleNotificationAsync({
              content: {
                title: "🔔 Тестовое уведомление",
                body: "Если вы видите это уведомление, значит настройки работают правильно!",
                sound: "default", // Звук всегда включен для уведомлений о лекарствах
                priority: Notifications.AndroidNotificationPriority.MAX,
                data: { test: true },
                categoryIdentifier: "medication-reminder",
                // Android-специфичные настройки
                ...(Platform.OS === "android" && {
                  vibrate: [0, 250, 250, 250, 250, 250],
                  lightColor: "#FF0000",
                  sticky: true,
                  autoDismiss: false,
                }),
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: 1,
              },
            });

            Alert.alert(
              t("settings.testNotificationSent") || "Тестовое уведомление отправлено",
              t("settings.testNotificationMessage") || "Уведомление должно появиться через 1 секунду"
            );
          } catch (error) {
            console.error("Error sending test notification:", error);
            Alert.alert(
              t("common.error") || "Ошибка",
              t("settings.testNotificationError") || "Не удалось отправить тестовое уведомление"
            );
          }
        }}
      >
        <MaterialCommunityIcons name="bell-ring" size={20} color={colors.white} style={{ marginRight: 8 }} />
        <Text style={styles.permissionButtonText}>
          {t("settings.sendTestNotification") || "Отправить тестовое уведомление"}
        </Text>
      </TouchableOpacity>

      {/* Информация о настройках */}
      <View style={[styles.permissionStatus, { marginTop: 20 }]}>
        <Text style={[styles.permissionStatusText, { fontWeight: "600", marginBottom: 8 }]}>
          {t("settings.notificationInfoTitle") || "Важная информация"}
        </Text>
        <Text style={styles.permissionStatusText}>
          {t("settings.notificationInfoText") || "• Уведомления о лекарствах работают даже при выключенном звуке (через вибрацию и свет)"}
        </Text>
        <Text style={[styles.permissionStatusText, { marginTop: 4 }]}>
          {t("settings.notificationInfoText2") || "• Уведомления работают при закрытом приложении"}
        </Text>
        <Text style={[styles.permissionStatusText, { marginTop: 4 }]}>
          {t("settings.notificationInfoText3") || "• Уведомления видны на заблокированном экране"}
        </Text>
        <Text style={[styles.permissionStatusText, { marginTop: 4 }]}>
          {t("settings.notificationInfoText4") || "• Уведомления обходят режим 'Не беспокоить'"}
        </Text>
        {Platform.OS === "android" && (
          <Text style={[styles.permissionStatusText, { marginTop: 8, color: colors.primary, fontWeight: "600" }]}>
            {t("settings.notificationInfoText5") || "⚠️ ВАЖНО: Если звук не воспроизводится, проверьте настройки канала 'Напоминания о лекарствах' в системных настройках Android. Звук должен быть включен для этого канала."}
          </Text>
        )}
      </View>

      <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}



