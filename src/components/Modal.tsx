import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Modal as RNModal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "../theme/colors";

interface ModalButton {
  text: string;
  onPress: () => void;
  style?: "default" | "primary" | "cancel" | "destructive";
  disabled?: boolean;
  loading?: boolean;
}

interface ModalProps {
  visible: boolean;
  onClose?: () => void;
  title: string;
  subtitle?: string;
  message?: string; // Добавлено для простых сообщений
  children?: React.ReactNode;
  buttons?: ModalButton[];
  showCloseButton?: boolean;
  buttonLayout?: "row" | "column"; // Расположение кнопок: в ряд или в колонку
}

export default function Modal({
  visible,
  onClose,
  title,
  subtitle,
  message,
  children,
  buttons,
  showCloseButton = true,
  buttonLayout = "row", // По умолчанию кнопки в ряд
}: ModalProps) {
  const colors = useColors();

  return (
    <RNModal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          {showCloseButton && onClose && (
            <TouchableOpacity
              style={styles.closeIconButton}
              onPress={onClose}
            >
              <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
          
          {subtitle && (
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}

          {message && (
            <Text style={[styles.modalMessage, { color: colors.text }]}>
              {message}
            </Text>
          )}

          {children && (
            <View style={styles.modalChildren}>
              {children}
            </View>
          )}

          {buttons && buttons.length > 0 && (
            <View style={[styles.modalButtons, buttonLayout === "column" && styles.modalButtonsColumn]}>
              {buttons.map((button, index) => {
                const buttonStyle =
                  button.style === "primary"
                    ? { backgroundColor: colors.primary }
                    : button.style === "destructive"
                    ? { backgroundColor: colors.error }
                    : button.style === "cancel"
                    ? { backgroundColor: colors.border }
                    : { backgroundColor: colors.border };

                const textColor =
                  button.style === "primary" || button.style === "destructive"
                    ? colors.white
                    : colors.text;

                const isDisabled = button.disabled || button.loading;
                const disabledTextColor = isDisabled ? colors.textSecondary : textColor;
                const disabledButtonStyle = isDisabled ? { opacity: 0.5 } : {};

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.modalButton,
                      buttonLayout === "column" && styles.modalButtonColumn,
                      buttonStyle,
                      disabledButtonStyle,
                    ]}
                    onPress={button.onPress}
                    disabled={isDisabled}
                  >
                    {button.loading ? (
                      <ActivityIndicator color={disabledTextColor} size="small" />
                    ) : (
                      <Text style={[styles.modalButtonText, { color: disabledTextColor }]}>
                        {button.text}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </RNModal>
  );
}

interface ModalInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
  autoFocus?: boolean;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
}

export function ModalInput({
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoFocus = false,
  secureTextEntry = false,
  multiline = false,
  numberOfLines = 1,
  maxLength,
}: ModalInputProps) {
  const colors = useColors();

  return (
    <TextInput
      style={[
        styles.modalInput,
        {
          color: colors.text,
          borderColor: colors.border,
          backgroundColor: colors.background,
        },
        multiline && { minHeight: 100, textAlignVertical: "top" },
      ]}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      autoFocus={autoFocus}
      secureTextEntry={secureTextEntry}
      multiline={multiline}
      numberOfLines={numberOfLines}
      maxLength={maxLength}
    />
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    width: "90%",
    maxWidth: 420,
    maxHeight: "85%",
    borderRadius: 20,
    padding: 28,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  closeIconButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 4,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
    paddingRight: 32, // Для кнопки закрытия
    lineHeight: 28,
  },
  modalSubtitle: {
    fontSize: 15,
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 22,
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 22,
  },
  modalChildren: {
    marginTop: 8,
    marginBottom: 8,
  },
  modalInput: {
    fontSize: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
  },
  modalButtonsColumn: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "stretch",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonColumn: {
    flex: 0,
    width: "100%",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});

