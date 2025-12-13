import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState, useEffect } from "react";
import {
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  RefreshControl,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../../../src/store/authStore";
import { useColors } from "../../../../src/theme/colors";
import { useLanguage } from "../../../../src/context/LanguageContext";
import { useTheme } from "../../../../src/context/ThemeContext";
import { getDoctors, deleteDoctor, Doctor } from "../../../../src/database/doctors.service";

export default function DoctorsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Обработка системной кнопки "Назад"
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.back();
        return true;
      };

      const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => backHandler.remove();
    }, [router])
  );

  const loadDoctors = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const data = await getDoctors(user.id);
      setDoctors(data);
    } catch (error) {
      console.error("Error loading doctors:", error);
      Alert.alert(t("common.error") || "Ошибка", t("doctors.loadError") || "Не удалось загрузить список врачей");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadDoctors();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDoctors();
  }, []);

  const handleDelete = (doctor: Doctor) => {
    Alert.alert(
      t("doctors.deleteConfirm") || "Удалить врача?",
      t("doctors.deleteMessage") || `Вы уверены, что хотите удалить ${doctor.name}?`,
      [
        {
          text: t("common.cancel") || "Отмена",
          style: "cancel",
        },
        {
          text: t("common.delete") || "Удалить",
          style: "destructive",
          onPress: async () => {
            try {
              if (doctor.id) {
                await deleteDoctor(doctor.id, user?.id);
                await loadDoctors();
              }
            } catch (error) {
              console.error("Error deleting doctor:", error);
              Alert.alert(t("common.error") || "Ошибка", t("doctors.deleteError") || "Не удалось удалить врача");
            }
          },
        },
      ]
    );
  };

  const renderDoctor = (doctor: Doctor) => {
    return (
      <TouchableOpacity
        style={styles.doctorItem}
        onPress={() => router.push(`/(tabs)/more/doctors/edit?id=${doctor.id}`)}
      >
        <View style={[styles.doctorIcon, { backgroundColor: colors.primary + "20" }]}>
          <MaterialCommunityIcons name="doctor" size={24} color={colors.primary} />
        </View>
        <View style={styles.doctorContent}>
          <Text style={styles.doctorName}>{doctor.name}</Text>
          {doctor.specialty && <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>}
          {doctor.phone && (
            <View style={styles.doctorInfoRow}>
              <MaterialCommunityIcons name="phone" size={16} color={colors.textSecondary} />
              <Text style={styles.doctorInfo}>{doctor.phone}</Text>
            </View>
          )}
          {doctor.email && (
            <View style={styles.doctorInfoRow}>
              <MaterialCommunityIcons name="email" size={16} color={colors.textSecondary} />
              <Text style={styles.doctorInfo}>{doctor.email}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => handleDelete(doctor)}
          style={styles.deleteButton}
        >
          <MaterialCommunityIcons name="delete-outline" size={24} color={colors.error} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

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
      paddingBottom: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    addButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    addButtonText: {
      color: colors.white,
      fontWeight: "600",
      fontSize: 14,
    },
    content: {
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: 16,
    },
    doctorItem: {
      backgroundColor: colors.surface,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      elevation: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowRadius: 2,
    },
    doctorIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    doctorContent: {
      flex: 1,
    },
    doctorName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    doctorSpecialty: {
      fontSize: 14,
      color: colors.primary,
      marginBottom: 8,
    },
    doctorInfoRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 4,
    },
    doctorInfo: {
      fontSize: 14,
      color: colors.textSecondary,
      marginLeft: 8,
    },
    deleteButton: {
      padding: 8,
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("more.doctors") || "Врачи"}</Text>
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/more/doctors/add")}
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>{t("common.add") || "Добавить"}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t("common.loading") || "Загрузка..."}</Text>
        </View>
      ) : doctors.length === 0 ? (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.emptyContainer}
        >
          <MaterialCommunityIcons name="doctor" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>
            {t("doctors.empty") || "Нет добавленных врачей. Добавьте первого врача!"}
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={doctors}
          renderItem={({ item }) => renderDoctor(item)}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

