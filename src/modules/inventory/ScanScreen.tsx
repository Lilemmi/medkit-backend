import { View, Text, StyleSheet } from "react-native";

export default function ScanScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📷 Сканирование лекарства</Text>
      <Text>Камера будет подключена позже</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
});
