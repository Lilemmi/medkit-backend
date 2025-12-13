import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import {
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../../../src/theme/colors";
import { useLanguage } from "../../../src/context/LanguageContext";
import { useTheme } from "../../../src/context/ThemeContext";

export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();
  const { isDark } = useTheme();

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

  const faqItems = [
    {
      question: t("help.faq1.question") || "Как добавить лекарство?",
      answer: t("help.faq1.answer") || "Перейдите на вкладку 'Главная' и нажмите кнопку 'Добавить лекарство'. Вы можете добавить лекарство вручную или отсканировать упаковку.",
    },
    {
      question: t("help.faq2.question") || "Как создать напоминание о приеме?",
      answer: t("help.faq2.answer") || "Откройте лекарство и нажмите кнопку 'Добавить напоминание'. Установите время и дни недели для приема.",
    },
    {
      question: t("help.faq3.question") || "Как синхронизировать данные?",
      answer: t("help.faq3.answer") || "Данные синхронизируются автоматически при подключении к интернету. Вы также можете выполнить ручную синхронизацию в настройках.",
    },
    {
      question: t("help.faq4.question") || "Как добавить члена семьи?",
      answer: t("help.faq4.answer") || "Перейдите на вкладку 'Семья' и нажмите кнопку 'Добавить'. Заполните информацию о члене семьи.",
    },
    {
      question: t("help.faq5.question") || "Как работает сканер рецептов?",
      answer: t("help.faq5.answer") || "Нажмите 'Сканер рецептов' на главном экране, сфотографируйте рецепт. Приложение автоматически распознает лекарства и добавит их в аптечку.",
    },
  ];

  const contactEmail = "support@smartaidkit.com";

  const handleEmailPress = () => {
    Linking.openURL(`mailto:${contactEmail}?subject=Вопрос о Smart Aid Kit`);
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
    content: {
      flex: 1,
    },
    section: {
      backgroundColor: colors.surface,
      padding: 16,
      marginTop: 16,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 16,
    },
    faqItem: {
      marginBottom: 24,
      paddingBottom: 24,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    faqItemLast: {
      borderBottomWidth: 0,
      marginBottom: 0,
      paddingBottom: 0,
    },
    faqQuestion: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    faqAnswer: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    contactSection: {
      backgroundColor: colors.surface,
      padding: 16,
      marginTop: 16,
      marginBottom: 16,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    contactText: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
      marginBottom: 16,
    },
    emailButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary + "20",
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    emailButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.primary,
      marginLeft: 12,
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("settings.help") || "Помощь и поддержка"}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("help.faq") || "Часто задаваемые вопросы"}</Text>
          {faqItems.map((item, index) => (
            <View
              key={index}
              style={[styles.faqItem, index === faqItems.length - 1 && styles.faqItemLast]}
            >
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Text style={styles.faqAnswer}>{item.answer}</Text>
            </View>
          ))}
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>{t("help.contact") || "Связаться с нами"}</Text>
          <Text style={styles.contactText}>
            {t("help.contactText") || "Если у вас есть вопросы или предложения, напишите нам:"}
          </Text>
          <TouchableOpacity style={styles.emailButton} onPress={handleEmailPress}>
            <MaterialCommunityIcons name="email" size={24} color={colors.primary} />
            <Text style={styles.emailButtonText}>{contactEmail}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

