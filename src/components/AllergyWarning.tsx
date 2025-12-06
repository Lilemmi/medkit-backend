import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View, Modal, ScrollView, Vibration } from "react-native";
import { useColors } from "../theme/colors";
import { useLanguage } from "../context/LanguageContext";
import { AllergyCheckResult } from "../services/allergy-check.service";
import * as Haptics from "expo-haptics";

interface AllergyWarningProps {
  visible: boolean;
  result: AllergyCheckResult | null;
  medicineName: string;
  onClose: () => void;
  onViewComposition?: () => void;
}

export default function AllergyWarning({
  visible,
  result,
  medicineName,
  onClose,
  onViewComposition,
}: AllergyWarningProps) {
  const colors = useColors();
  const { t } = useLanguage();

  // Вибрация для критических предупреждений
  if (visible && result?.severity === "critical") {
    Vibration.vibrate([0, 500, 200, 500]); // Двойная вибрация
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }

  if (!result || result.severity === "none") {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.successContainer}>
              <MaterialCommunityIcons
                name="check-circle"
                size={64}
                color={colors.success}
              />
              <Text style={[styles.successTitle, { color: colors.text }]}>
                {t("allergy.noAllergies")}
              </Text>
              <Text style={[styles.successText, { color: colors.textSecondary }]}>
                {t("allergy.noAllergiesMessage")}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.primary }]}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>{t("common.ok")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  const isCritical = result.severity === "critical";
  const backgroundColor = isCritical ? colors.error : colors.warning;
  const textColor = colors.white;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, isCritical && styles.criticalOverlay]}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: isCritical ? colors.error : colors.warning },
          ]}
        >
          {/* Иконка предупреждения */}
          <MaterialCommunityIcons
            name={isCritical ? "alert-circle" : "alert"}
            size={64}
            color={textColor}
            style={styles.icon}
          />

          {/* Заголовок */}
          <Text style={[styles.title, { color: textColor }]}>
            {isCritical ? t("allergy.criticalTitle") : t("allergy.mediumTitle")}
          </Text>

          {/* Сообщение */}
          <Text style={[styles.message, { color: textColor }]}>
            {isCritical
              ? t("allergy.criticalMessage", {
                  medicine: medicineName,
                  substance: result.matches[0]?.substance || "",
                  member: result.matches[0]?.memberName || "",
                })
              : t("allergy.mediumMessage", {
                  medicine: medicineName,
                  count: result.matches.length,
                })}
          </Text>

          {/* Список совпадений */}
          {result.matches.length > 0 && (
            <View style={styles.matchesContainer}>
              <Text style={[styles.matchesTitle, { color: textColor }]}>
                {t("allergy.matches")}:
              </Text>
              <ScrollView style={styles.matchesList}>
                {result.matches.map((match, index) => (
                  <View key={index} style={styles.matchItem}>
                    <MaterialCommunityIcons
                      name="alert"
                      size={20}
                      color={textColor}
                    />
                    <Text style={[styles.matchText, { color: textColor }]}>
                      {match.substance} - {match.memberName}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Кнопки */}
          <View style={styles.buttonsContainer}>
            {isCritical && onViewComposition && (
              <TouchableOpacity
                style={[styles.viewButton, { backgroundColor: textColor }]}
                onPress={onViewComposition}
              >
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={20}
                  color={backgroundColor}
                />
                <Text style={[styles.viewButtonText, { color: backgroundColor }]}>
                  {t("allergy.viewComposition")}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: textColor }]}
              onPress={onClose}
            >
              <Text style={[styles.closeButtonText, { color: backgroundColor }]}>
                {t("common.close")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  criticalOverlay: {
    backgroundColor: "rgba(220, 38, 38, 0.3)",
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
  },
  successText: {
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
  },
  icon: {
    marginBottom: 16,
    alignSelf: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  matchesContainer: {
    marginBottom: 20,
    maxHeight: 200,
  },
  matchesTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  matchesList: {
    maxHeight: 150,
  },
  matchItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  matchText: {
    fontSize: 14,
    flex: 1,
  },
  buttonsContainer: {
    gap: 12,
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  viewButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  closeButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});




