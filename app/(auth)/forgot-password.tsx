import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { validateEmail, validateRequired } from "../../src/utils/validation";
import { forgotPasswordApi, resetPasswordApi } from "../../src/api/auth";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"email" | "code" | "reset">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendCode = async () => {
    setError("");

    if (!validateRequired(email)) {
      setError("Введите email");
      return;
    }
    if (!validateEmail(email)) {
      setError("Некорректный email");
      return;
    }

    setLoading(true);
    try {
      await forgotPasswordApi(email.trim());
      Alert.alert(
        "Код отправлен",
        "Проверьте вашу почту. Мы отправили код для восстановления пароля.",
        [{ text: "OK", onPress: () => setStep("code") }]
      );
    } catch (e: any) {
      console.log("FORGOT PASSWORD ERROR:", e?.response?.data || e?.message || e);
      
      let errorMessage = "Ошибка отправки кода";
      if (e?.response?.data?.message) {
        errorMessage = e.response.data.message;
      } else if (e?.message) {
        errorMessage = e.message;
      } else if (e?.response?.status === 404) {
        errorMessage = "Пользователь с таким email не найден";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError("");

    if (!validateRequired(code)) {
      setError("Введите код");
      return;
    }

    // Переходим к шагу сброса пароля
    setStep("reset");
  };

  const handleResetPassword = async () => {
    setError("");

    if (!validateRequired(newPassword)) {
      setError("Введите новый пароль");
      return;
    }
    if (newPassword.length < 6) {
      setError("Пароль должен быть минимум 6 символов");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);
    try {
      await resetPasswordApi(email.trim(), code.trim(), newPassword);
      Alert.alert(
        "Пароль изменен",
        "Ваш пароль успешно изменен. Теперь вы можете войти с новым паролем.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(auth)/login"),
          },
        ]
      );
    } catch (e: any) {
      console.log("RESET PASSWORD ERROR:", e?.response?.data || e?.message || e);
      
      let errorMessage = "Ошибка сброса пароля";
      if (e?.response?.data?.message) {
        errorMessage = e.response.data.message;
      } else if (e?.message) {
        errorMessage = e.message;
      } else if (e?.response?.status === 400) {
        errorMessage = "Неверный код или код истек";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {step === "email"
          ? "Восстановление пароля"
          : step === "code"
          ? "Введите код"
          : "Новый пароль"}
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}

      {step === "email" && (
        <>
          <Text style={styles.description}>
            Введите email, который вы использовали при регистрации. Мы отправим вам код для восстановления пароля.
          </Text>

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

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSendCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Отправить код</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {step === "code" && (
        <>
          <Text style={styles.description}>
            Введите код, который мы отправили на {email}
          </Text>

          <TextInput
            placeholder="Код подтверждения"
            placeholderTextColor="#888"
            style={styles.input}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoCapitalize="none"
            editable={!loading}
            maxLength={6}
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleVerifyCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Продолжить</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setStep("email")}
            disabled={loading}
            style={styles.linkContainer}
          >
            <Text style={styles.link}>Изменить email</Text>
          </TouchableOpacity>
        </>
      )}

      {step === "reset" && (
        <>
          <Text style={styles.description}>
            Введите новый пароль для вашего аккаунта
          </Text>

          <TextInput
            placeholder="Новый пароль"
            placeholderTextColor="#888"
            secureTextEntry
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            autoCapitalize="none"
            autoComplete="password-new"
            editable={!loading}
          />

          <TextInput
            placeholder="Подтвердите пароль"
            placeholderTextColor="#888"
            secureTextEntry
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoCapitalize="none"
            autoComplete="password-new"
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Изменить пароль</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setStep("code")}
            disabled={loading}
            style={styles.linkContainer}
          >
            <Text style={styles.link}>Вернуться к коду</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        onPress={() => router.back()}
        disabled={loading}
        style={styles.backContainer}
      >
        <Text style={styles.backLink}>Вернуться к входу</Text>
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
    marginBottom: 20,
    color: "#111",
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
    textAlign: "center",
    lineHeight: 22,
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
    marginTop: 20,
    alignItems: "center",
  },
  link: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "500",
  },
  backContainer: {
    marginTop: 30,
    alignItems: "center",
  },
  backLink: {
    color: "#666",
    fontSize: 15,
    fontWeight: "400",
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
