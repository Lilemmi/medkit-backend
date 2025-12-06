import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { askGemini } from "../../../src/api/gemini";
import { useColors } from "../../../src/theme/colors";
import { useLanguage } from "../../../src/context/LanguageContext";

export default function ChatHome() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setLoading(true);

    try {
      const response = await askGemini(userMessage);
      setMessages((prev) => [...prev, { role: "ai", text: response }]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: t("chat.error") },
      ]);
    } finally {
      setLoading(false);
    }
  };

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
    messagesContainer: {
      flex: 1,
    },
    messagesContent: {
      padding: 16,
    },
    emptyState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      paddingHorizontal: 32,
    },
    message: {
      maxWidth: "80%",
      padding: 12,
      borderRadius: 16,
      marginBottom: 12,
    },
    userMessage: {
      alignSelf: "flex-end",
      backgroundColor: colors.primary,
    },
    aiMessage: {
      alignSelf: "flex-start",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    messageText: {
      fontSize: 16,
    },
    userMessageText: {
      color: colors.white,
    },
    aiMessageText: {
      color: colors.text,
    },
    inputContainer: {
      flexDirection: "row",
      padding: 16,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      alignItems: "flex-end",
      gap: 8,
    },
    input: {
      flex: 1,
      backgroundColor: colors.lightGray,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      maxHeight: 100,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sendButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
  });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <MaterialCommunityIcons name="robot" size={28} color={colors.primary} />
        <Text style={styles.headerTitle}>{t("chat.title")}</Text>
      </View>

      <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="robot-happy" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>{t("chat.emptyTitle")}</Text>
            <Text style={styles.emptySubtext}>
              {t("chat.emptySubtext")}
            </Text>
          </View>
        )}

        {messages.map((msg, idx) => (
          <View
            key={idx}
            style={[styles.message, msg.role === "user" ? styles.userMessage : styles.aiMessage]}
          >
            <Text style={[styles.messageText, msg.role === "user" ? styles.userMessageText : styles.aiMessageText]}>
              {msg.text}
            </Text>
          </View>
        ))}

        {loading && (
          <View style={[styles.message, styles.aiMessage]}>
            <Text style={[styles.messageText, styles.aiMessageText]}>{t("chat.thinking")}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={t("chat.placeholder")}
          placeholderTextColor={colors.textSecondary}
          multiline
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || loading) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || loading}
        >
          <MaterialCommunityIcons name="send" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
