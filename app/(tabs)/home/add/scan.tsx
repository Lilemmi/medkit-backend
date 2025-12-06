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
import { saveMedicine } from "../../../../src/database/medicine.service";
import { useAuthStore } from "../../../../src/store/authStore";

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [saved, setSaved] = useState(false);

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
        <Text>Камера недоступна в WEB</Text>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text>Запрашиваем разрешение…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>Нет доступа к камере</Text>
        <TouchableOpacity onPress={requestPermission}>
          <Text style={{ marginTop: 12, color: "blue" }}>Разрешить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // -------------------------------------------------
  // 📸 ФОТО
  // -------------------------------------------------
  async function takePhoto() {
    if (!cameraRef.current) return;

    setLoading(true);

    try {
      const pic = await cameraRef.current.takePictureAsync({ base64: true });
      setPhoto(pic);
      await analyzePhoto(pic.base64, pic.uri);
    } catch (e) {
      console.log("Ошибка фото:", e);
    } finally {
      setLoading(false);
    }
  }

  // -------------------------------------------------
  // 🤖 GEMINI 2.5 FLASH
  // -------------------------------------------------
  async function analyzePhoto(base64: string, photoUri: string) {
    setResult("Анализируем…");

    try {
      const url =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        GEMINI_API_KEY;

      const payload = {
        contents: [
          {
            role: "user",
            parts: [
              {
                text:
                  `Проанализируй упаковку лекарства и верни СТРОГО JSON:
{
  "name": "",
  "dose": "",
  "form": "",
  "expiry": ""
}
Только JSON. Без Markdown. Без текста.`
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

      const raw =
        json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      setResult(raw);

      // чистим JSON
      let cleaned = raw
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) {
        console.log("❌ JSON NOT FOUND");
        setResult("Ошибка: JSON не найден");
        return;
      }

      cleaned = match[0];

      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (e) {
        console.log("❌ JSON parse error:", e);
        setResult("Ошибка парсинга JSON");
        setParsedData(null);
        return;
      }

      // Сохраняем распарсенные данные для отображения
      setParsedData(parsed);
      setResult("Анализ завершен");
      console.log("✅ Данные распарсены:", parsed);
    } catch (e) {
      console.log("❌ Ошибка Gemini:", e);
      setResult("Ошибка анализа");
      setParsedData(null);
    }
  }

  // -------------------------------------------------
  // 💾 ДОБАВИТЬ В АПТЕЧКУ
  // -------------------------------------------------
  async function handleAddToMedkit() {
    if (!parsedData) {
      Alert.alert("Ошибка", "Нет данных для сохранения");
      return;
    }

    if (!user?.id) {
      Alert.alert("Ошибка", "Пользователь не найден");
      return;
    }

    try {
      // Проверяем аллергии перед сохранением
      const { checkMedicineAllergies } = await import("../../../../src/services/allergy-check.service");
      const allergyCheck = await checkMedicineAllergies(
        parsedData.name || "",
        user.id,
        user.allergies || undefined,
        user.name || undefined
      );

      // Если есть аллергии, показываем предупреждение
      if (allergyCheck.hasAllergies) {
        const { default: AllergyWarning } = await import("../../../../src/components/AllergyWarning");
        // TODO: Показать модальное окно с предупреждением
        // Пока используем Alert для простоты
        const severity = allergyCheck.severity === "critical" ? "⚠️ ОПАСНО!" : "⚠️ Предупреждение";
        const message = allergyCheck.matches
          .map(m => `${m.substance} - ${m.memberName}`)
          .join("\n");
        
        Alert.alert(
          severity,
          `Лекарство содержит вещества, на которые есть аллергии:\n\n${message}\n\nВсе равно сохранить?`,
          [
            { text: "Отмена", style: "cancel" },
            {
              text: "Сохранить",
              style: allergyCheck.severity === "critical" ? "destructive" : "default",
              onPress: async () => {
                await saveMedicine({
                  name: parsedData.name || null,
                  dose: parsedData.dose || null,
                  form: parsedData.form || null,
                  expiry: parsedData.expiry || null,
                  photoUri: photo?.uri || null,
                  userId: user.id,
                });
                setSaved(true);
                Alert.alert("Успешно!", "Лекарство добавлено в аптечку", [
                  { text: "OK", onPress: () => router.back() },
                ]);
              },
            },
          ]
        );
        return;
      }

      // Если аллергий нет, сохраняем лекарство
      await saveMedicine({
        name: parsedData.name || null,
        dose: parsedData.dose || null,
        form: parsedData.form || null,
        expiry: parsedData.expiry || null,
        photoUri: photo?.uri || null,
        userId: user.id,
      });

      setSaved(true);
      Alert.alert(
        "Успешно!",
        "Лекарство добавлено в аптечку",
        [
          {
            text: "OK",
            onPress: () => {
              router.back();
            },
          },
        ]
      );
    } catch (e) {
      console.log("❌ Ошибка сохранения:", e);
      Alert.alert("Ошибка", "Не удалось сохранить лекарство");
    }
  }

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 250],
  });

  // -------------------------------------------------
  // 📱 ЭКРАН РЕЗУЛЬТАТА
  // -------------------------------------------------
  if (photo) {
    return (
      <ScrollView 
        style={styles.resultContainer}
        contentContainerStyle={styles.resultContent}
      >
        <Image source={{ uri: photo.uri }} style={styles.resultImage} />

        <Text style={styles.title}>Результат анализа:</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#4A90E2" style={{ marginVertical: 20 }} />
        ) : parsedData ? (
          <View style={styles.dataContainer}>
            <View style={[styles.dataRow, styles.dataRowFirst]}>
              <Text style={styles.dataLabel}>Название:</Text>
              <Text style={styles.dataValue}>
                {parsedData.name || "Не указано"}
              </Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Дозировка:</Text>
              <Text style={styles.dataValue}>
                {parsedData.dose || "Не указано"}
              </Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Форма:</Text>
              <Text style={styles.dataValue}>
                {parsedData.form || "Не указано"}
              </Text>
            </View>
            <View style={[styles.dataRow, styles.dataRowLast]}>
              <Text style={styles.dataLabel}>Срок годности:</Text>
              <Text style={styles.dataValue}>
                {parsedData.expiry || "Не указано"}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.resultText}>{result || "Ожидание результата..."}</Text>
        )}

        {parsedData && !saved && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddToMedkit}
          >
            <Text style={styles.addButtonText}>Добавить в аптечку</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => {
            setPhoto(null);
            setResult(null);
            setParsedData(null);
            setSaved(false);
          }}
        >
          <Text style={styles.scanText}>Сканировать снова</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // -------------------------------------------------
  // 📱 ОСНОВНОЙ ЭКРАН СКАНЕРА (iOS Style)
  // -------------------------------------------------
  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />

        {/* Затемнение вокруг области сканирования - используем абсолютное позиционирование */}
        <View style={styles.overlay}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlayLeft} />
          <View style={styles.scanArea}>
            {/* Углы рамки */}
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
                  opacity: animation.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 1, 0.3],
                  }),
                }
              ]} 
            />
          </View>
          <View style={styles.overlayRight} />
        </View>
        <View style={styles.overlayBottom} />
        </View>

        {/* Кнопка закрытия */}
        <TouchableOpacity 
          style={[styles.closeButton, { top: insets.top + 10 }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <View style={styles.closeButtonInner}>
            <Text style={styles.closeButtonText}>✕</Text>
          </View>
        </TouchableOpacity>

        {/* Инструкция */}
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            Поместите упаковку лекарства в рамку
          </Text>
        </View>

        {/* Кнопка съемки (iOS style) */}
        <View style={styles.bottomControls}>
          <TouchableOpacity 
            style={styles.captureButton} 
            onPress={takePhoto}
            activeOpacity={0.8}
          >
            <View style={styles.captureButtonInner}>
              <View style={styles.captureButtonOuter} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
    backgroundColor: "#000",
  },
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  cameraContainer: {
    flex: 1,
    position: "relative",
  },
  camera: { 
    flex: 1,
  },
  // Затемнение вокруг области сканирования
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  overlayMiddle: {
    flexDirection: "row",
    height: 280,
  },
  overlayLeft: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  overlayRight: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  // Область сканирования
  scanArea: {
    width: 280,
    height: 280,
    position: "relative",
  },
  // Углы рамки (iOS style)
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#FFFFFF",
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 20,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 20,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 20,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 20,
  },
  // Анимированная линия сканирования
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#FFFFFF",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  // Кнопка закрытия
  closeButton: {
    position: "absolute",
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  closeButtonInner: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "300",
    lineHeight: 24,
  },
  // Инструкция
  instructionContainer: {
    position: "absolute",
    top: "45%",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 40,
  },
  instructionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: "hidden",
  },
  // Нижние элементы управления
  bottomControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingBottom: 40,
  },
  // Кнопка съемки (iOS style)
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
  },

  resultContainer: { 
    flex: 1, 
    backgroundColor: "#F7F9FC",
  },
  resultContent: {
    padding: 20,
    alignItems: "center",
  },
  resultImage: { 
    width: "100%", 
    height: 300, 
    borderRadius: 10,
    marginBottom: 20,
  },
  title: { 
    fontSize: 20, 
    marginTop: 10, 
    marginBottom: 20,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  resultText: { 
    marginTop: 10, 
    fontSize: 16, 
    textAlign: "center",
    color: "#8E8E93",
  },
  dataContainer: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E0E6ED",
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  dataRowFirst: {
    marginTop: 0,
  },
  dataRowLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  dataLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    flex: 1,
  },
  dataValue: {
    fontSize: 16,
    color: "#4A90E2",
    flex: 2,
    textAlign: "right",
  },
  addButton: {
    marginTop: 10,
    marginBottom: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: "#34C759",
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
  },
  scanButton: {
    marginTop: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: "#4A90E2",
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  scanText: { 
    fontSize: 18, 
    color: "#fff",
    fontWeight: "600",
  },
});
