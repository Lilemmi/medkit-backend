import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  validateEmail,
  validatePassword,
  validateRequired,
} from "../../src/utils/validation";
import { useAuthStore } from "../../src/store/authStore";

export default function LoginScreen() {
  const router = useRouter();
  const { login, loading, error: authError, token } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Редирект после успешного входа
  useEffect(() => {
    if (token && !loading) {
      router.replace("/(tabs)/home");
    }
  }, [token, loading]);

  const handleLogin = async () => {
    setError("");

    // Логируем значения перед валидацией
    console.log("🔍 LOGIN FORM VALUES:", { email, password: password ? "***" : undefined });

    // Валидация
    if (!validateRequired(email)) {
      setError("Введите email");
      return;
    }
    if (!validateEmail(email)) {
      setError("Некорректный email");
      return;
    }
    if (!validateRequired(password)) {
      setError("Введите пароль");
      return;
    }
    if (!validatePassword(password)) {
      setError("Пароль должен быть минимум 6 символов");
      return;
    }

    // Проверяем, что email и password не undefined перед отправкой
    if (!email || email === undefined || email.trim() === "") {
      setError("Email не может быть пустым");
      return;
    }
    if (!password || password === undefined || password.trim() === "") {
      setError("Пароль не может быть пустым");
      return;
    }

    // Отправка на backend
    console.log("🚀 CALLING login with:", { email, password: "***" });
    const success = await login(email.trim(), password);

    if (!success && authError) {
      setError(authError);
    }
    // Если успешно, useEffect перенаправит на главную страницу
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Вход</Text>

      {(error || authError) && (
        <Text style={styles.error}>{error || authError}</Text>
      )}

      <TextInput
        placeholder="Email"
        placeholderTextColor="#888"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        editable={!loading}
      />

      <TextInput
        placeholder="Пароль"
        placeholderTextColor="#888"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        autoComplete="password"
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Войти</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/(auth)/register")}
        disabled={loading}
        style={styles.linkContainer}
      >
        <Text style={styles.link}>Нет аккаунта? Зарегистрироваться</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    justifyContent: "center",
    backgroundColor: "#F5F5F7",
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
});
