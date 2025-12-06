import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getFamilyMemberById } from "../../../../src/services/family.service";
import { useColors } from "../../../../src/theme/colors";
import { useLanguage } from "../../../../src/context/LanguageContext";

export default function FamilyProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();

  const [member, setMember] = useState<any>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const data = await getFamilyMemberById(Number(id));
    setMember(data);
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    content: {
      padding: 20,
      paddingBottom: 40,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    centerText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    photoWrapper: {
      alignItems: "center",
      marginBottom: 20,
      marginTop: 20,
    },
    photo: {
      width: 150,
      height: 150,
      borderRadius: 75,
      borderWidth: 3,
      borderColor: colors.primary,
    },
    photoPlaceholder: {
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor: colors.lightGray,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 3,
      borderColor: colors.primary,
    },
    photoPlaceholderText: {
      fontSize: 48,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    name: {
      fontSize: 26,
      fontWeight: "700",
      marginBottom: 20,
      color: colors.text,
      textAlign: "center",
    },
    infoCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    field: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    value: {
      fontWeight: "600",
      color: colors.text,
      fontSize: 18,
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      marginTop: 25,
      marginBottom: 50,
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    buttonText: {
      color: colors.white,
      fontSize: 18,
      fontWeight: "600",
    },
  });

  if (!member) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("family.profile")}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.centerText}>{t("family.loading")}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("family.profile")}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Фото */}
        <View style={styles.photoWrapper}>
          {member.photoUri ? (
            <Image source={{ uri: member.photoUri }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>{member.name?.[0]?.toUpperCase() || "?"}</Text>
            </View>
          )}
        </View>

        {/* Имя */}
        <Text style={styles.name}>{member.name}</Text>

        {/* Информация */}
        <View style={styles.infoCard}>
          {/* Роль */}
          {member.role ? (
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.field}>{t("family.roleLabel")}</Text>
              <Text style={styles.value}>{member.role}</Text>
            </View>
          ) : null}

          {/* Дата рождения */}
          {member.birthdate ? (
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.field}>{t("family.birthdateLabel")}</Text>
              <Text style={styles.value}>{member.birthdate}</Text>
            </View>
          ) : null}

          {/* Аллергии */}
          <View>
            <Text style={styles.field}>{t("family.allergiesLabel")}</Text>
            <Text style={styles.value}>{member.allergies || t("family.notSpecified")}</Text>
          </View>
        </View>

        {/* Кнопка редактировать */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push(`/(tabs)/family/edit/${member.id}`)}
        >
          <MaterialCommunityIcons name="pencil" size={20} color={colors.white} style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>{t("family.edit")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
