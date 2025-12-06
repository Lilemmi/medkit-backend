import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../../src/store/authStore";
import { saveHealthMetric, getHealthMetrics, deleteHealthRecord } from "../../../src/database/health.service";
import { useColors } from "../../../src/theme/colors";
import { useLanguage } from "../../../src/context/LanguageContext";

export default function BloodSugarScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();
  const [sugar, setSugar] = useState("");
  const [notes, setNotes] = useState("");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRecords = async () => {
    try {
      const data = await getHealthMetrics("blood_sugar", user?.id);
      setRecords(data as any[]);
    } catch (error) {
      console.error("Error loading records:", error);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const handleSave = async () => {
    if (!sugar) {
      Alert.alert(t("common.error"), t("health.enterSugar"));
      return;
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      await saveHealthMetric({
        userId: user?.id || null,
        type: "blood_sugar",
        value: parseFloat(sugar),
        unit: t("health.sugarUnit"),
        notes: notes || undefined,
        date: today,
      });

      Alert.alert(t("common.success"), t("health.saved"));
      setSugar("");
      setNotes("");
      await loadRecords();
    } catch (error) {
      Alert.alert(t("common.error"), t("health.saveError"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert(
      t("health.deleteConfirm"),
      t("health.deleteQuestion"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            await deleteHealthRecord("health_metrics", id);
            await loadRecords();
          },
        },
      ]
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
      padding: 16,
      paddingBottom: 40,
    },
    form: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
      marginBottom: 8,
      marginTop: 12,
    },
    input: {
      backgroundColor: colors.lightGray,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    textArea: {
      height: 80,
      textAlignVertical: "top",
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 16,
      alignItems: "center",
      marginTop: 20,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
    },
    emptyState: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 32,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: 16,
    },
    recordCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    recordHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    recordValue: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.text,
    },
    recordDate: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    recordNotes: {
      fontSize: 14,
      color: colors.text,
      marginTop: 8,
    },
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("health.bloodSugar")}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>{t("health.bloodSugar")} ({t("health.sugarUnit")})</Text>
        <TextInput
          style={styles.input}
          placeholder="5.5"
          placeholderTextColor={colors.textSecondary}
          value={sugar}
          onChangeText={setSugar}
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>{t("health.notes")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t("health.notesPlaceholder")}
          placeholderTextColor={colors.textSecondary}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? t("common.saving") : t("health.save")}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>{t("health.history")}</Text>
      {records.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t("health.empty")}</Text>
        </View>
      ) : (
        records.map((record) => (
          <View key={record.id} style={styles.recordCard}>
            <View style={styles.recordHeader}>
              <View>
                <Text style={styles.recordValue}>
                  {record.value} {record.unit}
                </Text>
                <Text style={styles.recordDate}>{record.date}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(record.id)}>
                <MaterialCommunityIcons name="delete" size={24} color={colors.error} />
              </TouchableOpacity>
            </View>
            {record.notes && (
              <Text style={styles.recordNotes}>{record.notes}</Text>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

