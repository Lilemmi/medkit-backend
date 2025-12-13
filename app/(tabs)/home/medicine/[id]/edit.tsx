import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getDB } from "../../../../../src/database/medicine.database";
import { useColors } from "../../../../../src/theme/colors";
import { useLanguage } from "../../../../../src/context/LanguageContext";
import { useAuthStore } from "../../../../../src/store/authStore";
import { updateMedicine } from "../../../../../src/database/medicine.service";
import { getAllFamilyMembers } from "../../../../../src/services/family.service";
import ExpiryDatePicker from "../../../../../src/components/ExpiryDatePicker";
import { formatExpiryDate, convertMonthYearToFullDate } from "../../../../../src/utils/date-formatter";

export default function EditMedicineScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t, language } = useLanguage();
  const { user } = useAuthStore();

  const [medicine, setMedicine] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Формы данных
  const [form, setForm] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [expiryDate, setExpiryDate] = useState("");
  const [userDosage, setUserDosage] = useState("");
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);

  // Обработка системной кнопки "Назад" (Android)
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Возвращаемся на страницу деталей лекарства
        router.back();
        return true; // Предотвращаем стандартное поведение
      };

      // Добавляем обработчик
      const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress);

      // Удаляем обработчик при размонтировании
      return () => backHandler.remove();
    }, [router])
  );

  useEffect(() => {
    loadMedicine();
    loadFamilyMembers();
  }, [id]);

  async function loadFamilyMembers() {
    try {
      const members = await getAllFamilyMembers();
      const allMembers = [];
      if (user) {
        allMembers.push({
          id: `user-${user.id}`,
          name: user.name || user.email || "Я",
          role: "user",
        });
      }
      allMembers.push(...members);
      setFamilyMembers(allMembers);
    } catch (error) {
      console.error("Error loading family members:", error);
    }
  }

  async function loadMedicine() {
    if (!id) return;

    try {
      setLoading(true);
      const db = await getDB();
      const med = await db.getFirstAsync(
        `SELECT * FROM medicines WHERE id = ?`,
        [parseInt(id)]
      );

      if (med) {
        setMedicine(med);
        setForm(med.form || "");
        setQuantity(String(med.quantity || 1));
        setExpiryDate(formatExpiryDate(med.expiry) || "");
        setUserDosage(med.userDosage || "");
        setSelectedFamilyMemberId(med.familyMemberId ? String(med.familyMemberId) : (user ? `user-${user.id}` : null));
      }
    } catch (error) {
      console.error("Error loading medicine:", error);
      Alert.alert(t("common.error"), "Не удалось загрузить лекарство");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!medicine) return;

    try {
      setSaving(true);

      // Преобразуем ММ.ГГГГ в полную дату
      let expiryToSave: string | null = null;
      if (expiryDate && expiryDate.trim() !== "") {
        expiryToSave = convertMonthYearToFullDate(expiryDate.trim());
      }

      const quantityToSave = parseInt(quantity) || 1;
      const familyMemberIdToSave = selectedFamilyMemberId && !selectedFamilyMemberId.startsWith("user-") 
        ? parseInt(selectedFamilyMemberId) 
        : undefined;

      await updateMedicine(medicine.id, user.id, {
        form: form.trim() || undefined,
        quantity: quantityToSave,
        expiry: expiryToSave || undefined,
        userDosage: userDosage.trim() || undefined,
        familyMemberId: familyMemberIdToSave,
      });

      Alert.alert(
        t("common.success"),
        "Лекарство успешно обновлено",
        [
          {
            text: t("common.ok"),
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error("Error updating medicine:", error);
      Alert.alert(t("common.error"), "Не удалось обновить лекарство");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Редактировать</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!medicine) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Редактировать</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.text }]}>Лекарство не найдено</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Редактировать</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MaterialCommunityIcons name="check" size={24} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Основная информация</Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Название</Text>
            <Text style={[styles.value, { color: colors.textSecondary }]}>{medicine.name}</Text>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Форма выпуска</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={form}
              onChangeText={setForm}
              placeholder="таблетки, капсулы, сироп..."
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Количество упаковок</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={quantity}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^\d]/g, "");
                setQuantity(cleaned || "1");
              }}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Срок годности (ММ.ГГГГ)</Text>
            <ExpiryDatePicker
              value={expiryDate}
              onChange={(value) => setExpiryDate(value)}
              placeholder="Выберите месяц и год"
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Дозировка и назначение</Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Дозировка для пользователя</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={userDosage}
              onChangeText={setUserDosage}
              placeholder="например: 1 таблетка 2 раза в день"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Для кого это лекарство?</Text>
            <ScrollView style={{ maxHeight: 200 }}>
              {familyMembers.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    marginBottom: 8,
                    borderRadius: 8,
                    backgroundColor: selectedFamilyMemberId === String(member.id) ? colors.primary + "20" : colors.background,
                    borderWidth: 1,
                    borderColor: selectedFamilyMemberId === String(member.id) ? colors.primary : colors.border,
                  }}
                  onPress={() => setSelectedFamilyMemberId(String(member.id))}
                >
                  <MaterialCommunityIcons
                    name={selectedFamilyMemberId === String(member.id) ? "check-circle" : "circle-outline"}
                    size={24}
                    color={selectedFamilyMemberId === String(member.id) ? colors.primary : colors.textSecondary}
                    style={{ marginRight: 12 }}
                  />
                  <Text style={{ fontSize: 16, color: colors.text, flex: 1 }}>
                    {member.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
  },
  input: {
    fontSize: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
  },
});

