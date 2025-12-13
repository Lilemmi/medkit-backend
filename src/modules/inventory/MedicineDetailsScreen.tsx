import { View, Text, StyleSheet } from "react-native";

export default function MedicineDetailsScreen({ route }: any) {
  const { item } = route.params || {};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Информация о лекарстве</Text>

      <Text style={styles.text}>Название: {item?.name || "—"}</Text>
      <Text style={styles.text}>Дозировка: {item?.dose || "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  text: { fontSize: 18, marginBottom: 8 },
});
