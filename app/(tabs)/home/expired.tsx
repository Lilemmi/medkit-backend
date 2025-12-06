import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getExpiredMedicines } from "../../../src/database/medicine.service";

export default function ExpiredScreen() {
  const [list, setList] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const data = await getExpiredMedicines();
    setList(data);
  }

  const formatDaysAgo = (dateStr: string) => {
    const diff =
      (new Date().getTime() - new Date(dateStr).getTime()) /
      (1000 * 60 * 60 * 24);

    const days = Math.ceil(diff);
    return days === 0 ? "сегодня" : `${days} дн. назад`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Просроченные лекарства</Text>

      <ScrollView style={{ width: "100%" }}>
        {list.length === 0 && (
          <Text style={styles.empty}>Отлично! Здесь пока пусто 👏</Text>
        )}

        {list.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() =>
              router.push(`/ (tabs)/home/medicine/${item.id}`)
            }
          >
            <View style={styles.row}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={34}
                color="#D93636"
              />

              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>

                <Text style={styles.expiredText}>
                  истёк {formatDaysAgo(item.expiry)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 22,
    backgroundColor: "#F7F8FA",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 20,
    color: "#2D2D2D",
  },
  empty: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 18,
    color: "#777",
  },

  card: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  info: {
    marginLeft: 14,
  },

  name: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },

  expiredText: {
    marginTop: 6,
    color: "#D93636",
    fontWeight: "500",
  },
});
