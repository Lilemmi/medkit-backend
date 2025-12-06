import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAllFamilyMembers } from "../../../src/services/family.service";
import { useColors } from "../../../src/theme/colors";
import { useLanguage } from "../../../src/context/LanguageContext";

export default function FamilyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();
  const [members, setMembers] = useState<any[]>([]);

  async function load() {
    const data = await getAllFamilyMembers();
    setMembers(data);
  }

  useFocusEffect(() => {
    load();
  });

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    content: {
      padding: 20,
    },
    title: { fontSize: 26, fontWeight: "700", marginBottom: 20, color: colors.text },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatar: { width: 60, height: 60, borderRadius: 30 },
    name: { fontSize: 18, fontWeight: "600", color: colors.text },
    role: { color: colors.textSecondary, marginTop: 4 },
    addBtn: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      marginTop: 10,
    },
    addBtnText: { color: colors.white, fontSize: 18, fontWeight: "600" },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <MaterialCommunityIcons name="account-group" size={28} color={colors.primary} />
        <Text style={styles.headerTitle}>{t("tabs.family")}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {members.map((m: any) => (
        <TouchableOpacity
          key={m.id}
          style={styles.card}
          onPress={() => router.push(`/(tabs)/family/profile/${m.id}`)}
        >
          <Image
            source={
              m.photoUri
                ? { uri: m.photoUri }
                : require("../../../assets/avatar.png")

            }
            style={styles.avatar}
          />
          <View style={{ marginLeft: 14 }}>
            <Text style={styles.name}>{m.name}</Text>
            <Text style={styles.role}>{m.role || t("family.roleNotSpecified")}</Text>
          </View>
        </TouchableOpacity>
      ))}

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/family/add")}
        >
          <Text style={styles.addBtnText}>+ {t("family.add")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
