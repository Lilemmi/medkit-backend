import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GEMINI_API_KEY } from "../src/config/gemini";
import { saveMedicine } from "../src/database/medicine.service";

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

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
        setResult("Ошибка解析 JSON");
        return;
      }

      // Сохраняем в БД
      await saveMedicine({
        name: parsed.name ?? null,
        dose: parsed.dose ?? null,
        form: parsed.form ?? null,
        expiry: parsed.expiry ?? null,
        photoUri,
      });

      console.log("💾 Сохранено в SQLite");
    } catch (e) {
      console.log("❌ Ошибка Gemini:", e);
      setResult("Ошибка анализа");
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
      <View style={styles.resultContainer}>
        <Image source={{ uri: photo.uri }} style={styles.resultImage} />

        <Text style={styles.title}>Результат анализа:</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#4A90E2" />
        ) : (
          <Text style={styles.resultText}>{result}</Text>
        )}

        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => {
            setPhoto(null);
            setResult(null);
          }}
        >
          <Text style={styles.scanText}>Сканировать снова</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // -------------------------------------------------
  // 📱 ОСНОВНОЙ ЭКРАН СКАНЕРА
  // -------------------------------------------------
  return (
    <View style={{ flex: 1 }}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />

      <View style={styles.scannerFrame}>
        <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
      </View>

      <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
        <Text style={styles.captureText}>Сканировать</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  camera: { flex: 1 },

  scannerFrame: {
    position: "absolute",
    top: "20%",
    left: "10%",
    width: "80%",
    height: 260,
    borderWidth: 3,
    borderColor: "#00FFAA",
    borderRadius: 12,
    overflow: "hidden",
  },

  scanLine: {
    position: "absolute",
    width: "100%",
    height: 4,
    backgroundColor: "#00FFAA",
    opacity: 0.9,
  },

  captureButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "#4A90E2",
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
  },

  captureText: { color: "#fff", fontSize: 18, fontWeight: "600" },

  resultContainer: { flex: 1, padding: 20, alignItems: "center" },

  resultImage: { width: "100%", height: 300, borderRadius: 10 },

  title: { fontSize: 20, marginTop: 20, fontWeight: "700" },

  resultText: { marginTop: 10, fontSize: 16, textAlign: "center" },

  scanButton: {
    marginTop: 20,
    padding: 14,
    backgroundColor: "#4A90E2",
    borderRadius: 12,
  },

  scanText: { fontSize: 18, color: "#fff" },
});
