import { useAuthStore } from "../../src/store/authStore";
import { colors } from "../../src/theme/colors";
import BottomSheet from "@gorhom/bottom-sheet";
import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

export default function BottomSheetProfile({ sheetRef }) {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const snapPoints = useMemo(() => ["1%", "50%"], []);

  const handleEditProfile = () => {
    sheetRef.current?.close();
    router.push("/(tabs)/settings/profile");
  };

  const handleSettings = () => {
    sheetRef.current?.close();
    router.push("/(tabs)/settings");
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      backgroundStyle={{ backgroundColor: colors.background }}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Профиль</Text>

        <Text style={styles.name}>{user?.name || "Гость"}</Text>
        <Text style={styles.email}>{user?.email || ""}</Text>

        <TouchableOpacity style={styles.btn} onPress={handleEditProfile}>
          <Text style={styles.btnText}>Редактировать профиль</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={handleSettings}>
          <Text style={styles.btnText}>Настройки</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logout} onPress={logout}>
          <Text style={styles.logoutText}>Выйти</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    color: colors.text,
  },
  name: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 4,
    color: colors.text,
  },
  email: {
    color: colors.gray,
    marginBottom: 24,
    fontSize: 16,
  },
  btn: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  btnText: {
    fontSize: 17,
    color: colors.text,
    fontWeight: "500",
  },
  logout: {
    marginTop: 24,
    paddingVertical: 16,
    backgroundColor: "#FFF5F5",
    borderRadius: 12,
    alignItems: "center",
  },
  logoutText: {
    color: "#D14B4B",
    fontSize: 17,
    fontWeight: "600",
  },
});
