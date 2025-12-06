import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

export default function Button({ title, onPress }: any) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
  },
  text: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 17,
  },
});
