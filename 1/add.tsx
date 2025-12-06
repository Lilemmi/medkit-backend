import { View, Text, TextInput, StyleSheet, TouchableOpacity } from "react-native";

export default function AddMedicineScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Добавить лекарство</Text>

      <TextInput placeholder="Название" style={styles.input} />
      <TextInput placeholder="Дозировка" style={styles.input} />

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Сохранить</Text>
      </TouchableOpacity>
    </View>
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
  },
  button: { backgroundColor: "#4A90E2", padding: 15, borderRadius: 10 },
  buttonText: { color: "#fff", textAlign: "center", fontSize: 18 },
});
