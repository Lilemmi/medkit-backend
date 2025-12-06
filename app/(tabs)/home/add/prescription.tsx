import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GEMINI_API_KEY } from "../../../../src/config/gemini";
import { useAuthStore } from "../../../../src/store/authStore";
import { createReminder } from "../../../../src/database/reminders.service";
import { saveMedicine } from "../../../../src/database/medicine.service";
import { useColors } from "../../../../src/theme/colors";
import { useLanguage } from "../../../../src/context/LanguageContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface PrescriptionMedicine {
  name: string;
  dose: string;
  timesPerDay: number; // Количество приемов в день
  times?: string[]; // Конкретное время приема (опционально)
}

interface PrescriptionData {
  medicines: PrescriptionMedicine[];
  doctorName?: string;
  date?: string;
}

export default function PrescriptionScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const colors = useColors();
  const { t, language } = useLanguage();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [parsedData, setParsedData] = useState<PrescriptionData | null>(null);
  const [saved, setSaved] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Анимация лазера
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animation, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(animation, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  if (Platform.OS === "web") {
    return (
      <View style={styles.center}>
        <Text>{t("prescription.cameraNotAvailable")}</Text>
      </View>
    );
  }

  if (!permission) {
    return <View style={styles.center} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t("prescription.scannerTitle")}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <Text style={[styles.message, { color: colors.text }]}>{t("prescription.cameraPermission")}</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={styles.buttonText}>{t("prescription.requestPermission")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // -------------------------------------------------
  // 📸 СДЕЛАТЬ ФОТО
  // -------------------------------------------------
  async function takePicture() {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });
      setPhoto(photo);
      await analyzePrescription(photo.base64);
    } catch (e) {
      console.log("❌ Camera error:", e);
      Alert.alert(t("common.error"), t("prescription.cameraError"));
    }
  }

  // -------------------------------------------------
  // 🤖 АНАЛИЗ РЕЦЕПТА (GEMINI)
  // -------------------------------------------------
  async function analyzePrescription(base64: string) {
    setLoading(true);
    setResult(null);
    setParsedData(null);

    try {
      const url =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        GEMINI_API_KEY;

      // Получаем язык пользователя для промпта
      const currentLanguage = language;
      const promptText = currentLanguage === "ru" 
        ? `Проанализируй рецепт врача и верни СТРОГО JSON:
{
  "medicines": [
    {
      "name": "название лекарства",
      "dose": "дозировка (например, 500мг)",
      "timesPerDay": количество_приемов_в_день,
      "times": ["09:00", "21:00"] // опционально, конкретное время приема
    }
  ]
}
Только JSON. Без Markdown. Без текста.`
        : currentLanguage === "en"
        ? `Analyze the doctor's prescription and return STRICTLY JSON:
{
  "medicines": [
    {
      "name": "medicine name",
      "dose": "dosage (e.g., 500mg)",
      "timesPerDay": number_of_times_per_day,
      "times": ["09:00", "21:00"] // optional, specific times
    }
  ]
}
Only JSON. No Markdown. No text.`
        : `נתח את המרשם הרפואי והחזר JSON בלבד:
{
  "medicines": [
    {
      "name": "שם התרופה",
      "dose": "מינון (למשל, 500mg)",
      "timesPerDay": מספר_פעמים_ביום,
      "times": ["09:00", "21:00"] // אופציונלי, זמנים ספציפיים
    }
  ]
}
רק JSON. ללא Markdown. ללא טקסט.`;

      const payload = {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: promptText,
              },
              {
                inlineData: {
                  data: base64,
                  mimeType: "image/jpeg",
                },
              },
            ],
          },
        ],
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      console.log("📌 RAW GEMINI:", json);

      const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      setResult(raw);

      // Очищаем JSON
      let cleaned = raw
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) {
        console.log("❌ JSON NOT FOUND");
        setResult(t("prescription.jsonNotFound"));
        return;
      }

      cleaned = match[0];

      let parsed: PrescriptionData;
      try {
        parsed = JSON.parse(cleaned);
      } catch (e) {
        console.log("❌ JSON parse error:", e);
        setResult(t("prescription.parseError"));
        setParsedData(null);
        return;
      }

      setParsedData(parsed);
      setResult(t("prescription.analysisComplete"));
      console.log("✅ Данные распарсены:", parsed);
    } catch (e) {
      console.log("❌ Ошибка Gemini:", e);
      setResult(t("prescription.analysisError"));
      setParsedData(null);
    } finally {
      setLoading(false);
    }
  }

  // -------------------------------------------------
  // 💾 СОЗДАТЬ НАПОМИНАНИЯ ИЗ РЕЦЕПТА
  // -------------------------------------------------
  async function handleCreateReminders() {
    if (!parsedData || !user?.id) {
      Alert.alert(t("common.error"), t("prescription.noData"));
      return;
    }

    setProcessing(true);

    try {
      let createdCount = 0;

      for (const medicine of parsedData.medicines) {
        // Сохраняем лекарство в базу
        const medicineId = await saveMedicine({
          name: medicine.name,
          dose: medicine.dose,
          form: null,
          expiry: null,
          photoUri: null,
          userId: user.id,
        });

        // Создаем напоминания
        if (medicine.times && medicine.times.length > 0) {
          // Если указано конкретное время
          for (const timeStr of medicine.times) {
            const [hour, minute] = timeStr.split(":").map(Number);
            if (hour >= 6 && hour < 24) {
              await createReminder({
                medicineId,
                medicineName: medicine.name,
                title: `${t("prescription.takeMedicine")}: ${medicine.name}`,
                body: `${medicine.dose} - ${t("prescription.time")} ${timeStr}`,
                hour,
                minute: minute || 0,
                daysOfWeek: undefined, // Ежедневно
                userId: user.id,
              });
              createdCount++;
            }
          }
        } else {
          // Если указано только количество раз в день, распределяем равномерно с 6:00 до 24:00
          const timesPerDay = medicine.timesPerDay || 1;
          const startHour = 6;
          const endHour = 24;
          const interval = (endHour - startHour) / timesPerDay;

          for (let i = 0; i < timesPerDay; i++) {
            const hour = Math.floor(startHour + interval * i);
            const minute = i === 0 ? 0 : 30; // Первый прием в :00, остальные в :30

            await createReminder({
              medicineId,
              medicineName: medicine.name,
              title: `${t("prescription.takeMedicine")}: ${medicine.name}`,
              body: `${medicine.dose} - ${t("prescription.time")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
              hour,
              minute,
              daysOfWeek: undefined, // Ежедневно
              userId: user.id,
            });
            createdCount++;
          }
        }
      }

      setSaved(true);
      Alert.alert(
        t("common.success"),
        t("prescription.remindersCreated", { count: createdCount }),
        [
          {
            text: t("common.ok"),
            onPress: () => router.back(),
          },
        ]
      );
    } catch (e) {
      console.log("❌ Ошибка создания напоминаний:", e);
      Alert.alert(t("common.error"), t("prescription.createError"));
    } finally {
      setProcessing(false);
    }
  }

  // Вычисляем высоту рамки сканирования для анимации линии
  // aspectRatio 1.4 означает, что высота = ширина / 1.4
  // Ширина 85% экрана, примерно 300px на среднем устройстве
  // Высота будет примерно 300 / 1.4 ≈ 214px
  const scanAreaHeight = 214;
  
  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, scanAreaHeight],
  });

  // -------------------------------------------------
  // 📱 ЭКРАН РЕЗУЛЬТАТА
  // -------------------------------------------------
  if (photo) {
    return (
      <ScrollView
        style={[styles.resultContainer, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.resultContent}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t("prescription.scannerTitle")}</Text>
          <View style={{ width: 24 }} />
        </View>

        <Image source={{ uri: photo.uri }} style={styles.resultImage} />

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
        ) : parsedData ? (
          <View style={[styles.dataContainer, { backgroundColor: colors.surface }]}>
            {parsedData.medicines.map((med, index) => (
              <View key={index} style={[styles.medicineCard, { borderColor: colors.border }]}>
                <Text style={[styles.medicineName, { color: colors.text }]}>{med.name}</Text>
                <Text style={[styles.medicineDose, { color: colors.textSecondary }]}>
                  {t("prescription.dose")}: {med.dose}
                </Text>
                <Text style={[styles.medicineTimes, { color: colors.textSecondary }]}>
                  {t("prescription.timesPerDay")}: {med.timesPerDay}
                </Text>
                {med.times && med.times.length > 0 && (
                  <Text style={[styles.medicineTimes, { color: colors.textSecondary }]}>
                    {t("prescription.times")}: {med.times.join(", ")}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.resultText, { color: colors.text }]}>
            {result || t("prescription.waiting")}
          </Text>
        )}

        {parsedData && !saved && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={handleCreateReminders}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.addButtonText}>{t("prescription.createReminders")}</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.scanButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            setPhoto(null);
            setParsedData(null);
            setResult(null);
            setSaved(false);
          }}
        >
          <Text style={[styles.scanButtonText, { color: colors.primary }]}>
            {t("prescription.scanAgain")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // -------------------------------------------------
  // 📷 ЭКРАН КАМЕРЫ
  // -------------------------------------------------
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t("prescription.scannerTitle")}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        />
        
        {/* Overlay - используем абсолютное позиционирование */}
        <View style={styles.overlay}>
          {/* Верхняя часть */}
          <View style={styles.overlayTop} />

          {/* Центральная область сканирования */}
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />

            {/* Анимированная линия сканирования */}
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [{ translateY }],
                },
              ]}
            />
          </View>

          {/* Нижняя часть с рекомендациями */}
          <View style={styles.overlayBottom}>
            <View style={styles.recommendationsContainer}>
              <Text style={styles.recommendationsTitle}>{t("prescription.recommendationsTitle")}</Text>
              <Text style={styles.recommendationItem}>• {t("prescription.recommendation1")}</Text>
              <Text style={styles.recommendationItem}>• {t("prescription.recommendation2")}</Text>
              <Text style={styles.recommendationItem}>• {t("prescription.recommendation3")}</Text>
              <Text style={styles.recommendationItem}>• {t("prescription.recommendation4")}</Text>
            </View>
          </View>
        </View>

        {/* Кнопка захвата */}
        <View style={styles.captureContainer}>
          <TouchableOpacity
            style={[styles.captureButton, { backgroundColor: colors.white }]}
            onPress={takePicture}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <View style={[styles.captureButtonInner, { backgroundColor: colors.primary }]} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  cameraContainer: {
    flex: 1,
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  overlayTop: {
    flex: 0.4,
    minHeight: 80,
  },
  scanArea: {
    width: "85%",
    aspectRatio: 1.4,
    alignSelf: "center",
    position: "relative",
    marginVertical: 20,
    overflow: "hidden",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#fff",
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    width: "100%",
    height: 3,
    backgroundColor: "#4A90E2",
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    top: 0,
  },
  overlayBottom: {
    flex: 0,
    justifyContent: "flex-end",
    paddingBottom: 100,
    paddingTop: 20,
    alignItems: "center",
  },
  recommendationsContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    maxWidth: "90%",
  },
  recommendationsTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  recommendationItem: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    textAlign: "left",
  },
  captureContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.3)",
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  resultContainer: {
    flex: 1,
  },
  resultContent: {
    padding: 20,
    paddingBottom: 40,
  },
  resultImage: {
    width: "100%",
    height: 300,
    borderRadius: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  dataContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  medicineCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  medicineDose: {
    fontSize: 14,
    marginBottom: 4,
  },
  medicineTimes: {
    fontSize: 14,
  },
  resultText: {
    fontSize: 16,
    textAlign: "center",
    marginVertical: 20,
  },
  addButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  scanButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
});

