import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from "react-native";
import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { saveMedicine } from "../../database/medicine.service";
import { useAuthStore } from "../../store/authStore";
import { fullSync } from "../../services/medicine-sync.service";

export default function AddMedicineScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [form, setForm] = useState("");
  const [expiry, setExpiry] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Ошибка", "Введите название лекарства");
      return;
    }

    if (!user?.id) {
      Alert.alert("Ошибка", "Пользователь не авторизован");
      return;
    }

    setLoading(true);

    try {
      await saveMedicine({
        name: name.trim(),
        dose: dose.trim() || null,
        form: form.trim() || null,
        expiry: expiry.trim() || null,
        photoUri: null,
        userId: user.id,
      });

      Alert.alert("Успех", "Лекарство добавлено", [
        {
          text: "OK",
          onPress: () => {
            navigation.goBack();
            // Синхронизируем с сервером в фоне
            fullSync(user.id).catch(console.error);
          },
        },
      ]);
    } catch (error) {
      console.error("Error saving medicine:", error);
      Alert.alert("Ошибка", "Не удалось сохранить лекарство");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Добавить лекарство</Text>

      <TextInput
        placeholder="Название *"
        style={styles.input}
        value={name}
        onChangeText={setName}
        editable={!loading}
      />

      <TextInput
        placeholder="Дозировка (например, 500мг)"
        style={styles.input}
        value={dose}
        onChangeText={setDose}
        editable={!loading}
      />

      <TextInput
        placeholder="Форма (таблетки, капсулы и т.д.)"
        style={styles.input}
        value={form}
        onChangeText={setForm}
        editable={!loading}
      />

      <TextInput
        placeholder="Срок годности (YYYY-MM-DD)"
        style={styles.input}
        value={expiry}
        onChangeText={setExpiry}
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Сохранить</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 15 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#4A90E2",
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: { color: "#fff", fontSize: 18, textAlign: "center", fontWeight: "600" },
});
