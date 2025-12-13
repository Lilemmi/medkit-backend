import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import {
  validateEmail,
  validatePassword,
  validateRequired,
} from "../../src/utils/validation";
import { useAuthStore } from "../../src/store/authStore";
import BirthDatePicker from "../../src/components/BirthDatePicker";

export default function RegisterScreen() {
  const router = useRouter();
  const { register, loading, error: authError, token } = useAuthStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [gender, setGender] = useState<string>("");
  const [allergies, setAllergies] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [error, setError] = useState("");

  // Редирект после успешной регистрации
  useEffect(() => {
    if (token && !loading) {
      router.replace("/(tabs)/home");
    }
  }, [token, loading]);

  const handleRegister = async () => {
    setError("");

    // Логируем значения перед валидацией
    console.log("🔍 REGISTER FORM VALUES:", { name, email, password: password ? "***" : undefined });

    // Валидация обязательных полей
    if (!validateRequired(name)) {
      setError("Введите имя");
      return;
    }
    if (!validateRequired(email)) {
      setError("Введите email");
      return;
    }
    if (!validateEmail(email)) {
      setError("Некорректный email");
      return;
    }
    if (!validatePassword(password)) {
      setError("Пароль должен быть минимум 6 символов");
      return;
    }
    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }
    if (!gender) {
      setError("Выберите пол");
      return;
    }
    if (!validateRequired(allergies)) {
      setError("Укажите аллергии (если нет аллергий, укажите 'Нет')");
      return;
    }
    if (!birthDate || birthDate.trim() === "") {
      setError("Укажите дату рождения");
      return;
    }
    
    // Проверяем формат даты (должен быть YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate.trim())) {
      setError("Дата рождения должна быть полной (день, месяц, год)");
      return;
    }

    // Проверяем, что все поля не undefined перед отправкой
    if (!name || name === undefined || name.trim() === "") {
      setError("Имя не может быть пустым");
      return;
    }
    if (!email || email === undefined || email.trim() === "") {
      setError("Email не может быть пустым");
      return;
    }
    if (!password || password === undefined || password.trim() === "") {
      setError("Пароль не может быть пустым");
      return;
    }

    // Отправка на backend
    console.log("🚀 CALLING register with:", { name, email, password: "***", gender, allergies, birthDate });
    const success = await register(
      name.trim(),
      email.trim(),
      password,
      gender,
      allergies.trim(),
      birthDate.trim()
    );

    if (!success && authError) {
      setError(authError);
    }
    // Если успешно, useEffect перенаправит на главную страницу
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Регистрация</Text>

      {(error || authError) && (
        <Text style={styles.error}>{error || authError}</Text>
      )}

      <TextInput
        placeholder="Имя *"
        placeholderTextColor="#888"
        style={styles.input}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        editable={!loading}
      />

      <TextInput
        placeholder="Email *"
        placeholderTextColor="#888"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />

      {/* Пол */}
      <View style={styles.section}>
        <Text style={styles.label}>Пол *</Text>
        <View style={styles.genderContainer}>
          <TouchableOpacity
            style={[styles.genderButton, gender === "male" && styles.genderButtonActive]}
            onPress={() => setGender("male")}
            disabled={loading}
          >
            <Text style={[styles.genderButtonText, gender === "male" && styles.genderButtonTextActive]}>
              Мужской
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.genderButton, gender === "female" && styles.genderButtonActive]}
            onPress={() => setGender("female")}
            disabled={loading}
          >
            <Text style={[styles.genderButtonText, gender === "female" && styles.genderButtonTextActive]}>
              Женский
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.genderButton, gender === "other" && styles.genderButtonActive]}
            onPress={() => setGender("other")}
            disabled={loading}
          >
            <Text style={[styles.genderButtonText, gender === "other" && styles.genderButtonTextActive]}>
              Другое
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Дата рождения */}
      <View style={styles.section}>
        <Text style={styles.label}>Дата рождения *</Text>
        <BirthDatePicker
          value={birthDate}
          onChange={(value) => setBirthDate(value)}
          placeholder="Выберите дату рождения"
        />
      </View>

      <TextInput
        placeholder="Аллергии * (если нет, укажите 'Нет')"
        placeholderTextColor="#888"
        style={[styles.input, styles.textArea]}
        value={allergies}
        onChangeText={setAllergies}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        editable={!loading}
      />

      <TextInput
        placeholder="Пароль *"
        placeholderTextColor="#888"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        editable={!loading}
      />

      <TextInput
        placeholder="Повтор пароля *"
        placeholderTextColor="#888"
        secureTextEntry
        style={styles.input}
        value={confirm}
        onChangeText={setConfirm}
        autoCapitalize="none"
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Создать аккаунт</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/(auth)/login")}
        disabled={loading}
        style={styles.linkContainer}
      >
        <Text style={styles.link}>Уже есть аккаунт? Войти</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
  },
  contentContainer: {
    padding: 25,
    paddingBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    marginBottom: 40,
    color: "#111",
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D1D1D6",
    marginBottom: 16,
    backgroundColor: "#fff",
    fontSize: 17,
    color: "#000000",
  },
  btn: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 14,
    marginTop: 10,
    shadowColor: "#007AFF",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },
  linkContainer: {
    marginTop: 25,
    alignItems: "center",
  },
  link: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "500",
  },
  error: {
    color: "#FF3B30",
    marginBottom: 10,
    fontSize: 16,
    textAlign: "center",
    padding: 10,
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
  },
  genderContainer: {
    flexDirection: "row",
    gap: 8,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#D1D1D6",
    alignItems: "center",
  },
  genderButtonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  genderButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111",
  },
  genderButtonTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
});
