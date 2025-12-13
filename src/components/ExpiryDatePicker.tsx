import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  Platform,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import { useColors } from "../theme/colors";
import { useLanguage } from "../context/LanguageContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface ExpiryDatePickerProps {
  value?: string; // Формат: "ММ.ГГГГ" или "YYYY-MM-DD"
  onChange: (value: string) => void; // Возвращает "ММ.ГГГГ"
  placeholder?: string;
}

const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;

export default function ExpiryDatePicker({
  value,
  onChange,
  placeholder,
}: ExpiryDatePickerProps) {
  const colors = useColors();
  const { language } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const monthScrollRef = useRef<ScrollView>(null);
  const yearScrollRef = useRef<ScrollView>(null);

  // Месяцы в виде цифр
  const months = [
    { value: "01", label: "01" },
    { value: "02", label: "02" },
    { value: "03", label: "03" },
    { value: "04", label: "04" },
    { value: "05", label: "05" },
    { value: "06", label: "06" },
    { value: "07", label: "07" },
    { value: "08", label: "08" },
    { value: "09", label: "09" },
    { value: "10", label: "10" },
    { value: "11", label: "11" },
    { value: "12", label: "12" },
  ];

  // Генерируем список лет (от текущего до +10 лет)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear + i);

  // Парсим текущее значение
  const parseValue = (val?: string): { month: string; year: string } => {
    if (!val || val.trim() === "") return { month: "", year: "" };

    // Если формат ММ.ГГГГ
    if (/^\d{2}\.\d{4}$/.test(val.trim())) {
      const [month, year] = val.trim().split(".");
      return { month: month || "", year: year || "" };
    }

    // Если формат YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
      const parts = val.trim().split("-");
      return { month: parts[1] || "", year: parts[0] || "" };
    }

    return { month: "", year: "" };
  };

  // Инициализация значений
  useEffect(() => {
    const parsed = parseValue(value);
    setSelectedMonth(parsed.month || "");
    setSelectedYear(parsed.year || "");
  }, [value]);

  // Прокрутка к выбранному элементу при открытии модального окна
  useEffect(() => {
    if (modalVisible) {
      setTimeout(() => {
        // Прокрутка месяца
        if (selectedMonth) {
          const monthIndex = months.findIndex((m) => m.value === selectedMonth);
          if (monthIndex >= 0 && monthScrollRef.current) {
            monthScrollRef.current.scrollTo({
              y: monthIndex * ITEM_HEIGHT,
              animated: false,
            });
          }
        } else if (monthScrollRef.current) {
          // Если месяц не выбран, прокручиваем к первому
          monthScrollRef.current.scrollTo({
            y: 0,
            animated: false,
          });
        }
        
        // Прокрутка года
        if (selectedYear) {
          const yearIndex = years.findIndex((y) => y.toString() === selectedYear);
          if (yearIndex >= 0 && yearScrollRef.current) {
            yearScrollRef.current.scrollTo({
              y: yearIndex * ITEM_HEIGHT,
              animated: false,
            });
          }
        } else if (yearScrollRef.current) {
          // Если год не выбран, прокручиваем к первому году в списке (не устанавливаем автоматически)
          yearScrollRef.current.scrollTo({
            y: 0,
            animated: false,
          });
        }
      }, 300);
    }
  }, [modalVisible]);

  const handleMonthScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(Math.round(y / ITEM_HEIGHT), months.length - 1));
    const newMonth = months[index]?.value;
    if (newMonth && newMonth !== selectedMonth) {
      console.log("📅 ExpiryDatePicker: Выбран месяц:", newMonth);
      setSelectedMonth(newMonth);
    }
  };

  const handleYearScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(Math.round(y / ITEM_HEIGHT), years.length - 1));
    const newYear = years[index]?.toString();
    if (newYear && newYear !== selectedYear) {
      console.log("📅 ExpiryDatePicker: Выбран год:", newYear);
      setSelectedYear(newYear);
    }
  };

  const handleConfirm = () => {
    if (selectedMonth && selectedYear) {
      const value = `${selectedMonth}.${selectedYear}`;
      console.log("📅 ExpiryDatePicker: Выбрана дата:", value);
      onChange(value);
    } else {
      console.log("⚠️ ExpiryDatePicker: Не выбраны месяц или год");
    }
    setModalVisible(false);
  };

  const handleCancel = () => {
    // Восстанавливаем исходные значения
    const parsed = parseValue(value);
    setSelectedMonth(parsed.month || "");
    setSelectedYear(parsed.year || "");
    setModalVisible(false);
  };

  const displayValue = () => {
    if (!selectedMonth || !selectedYear) {
      return placeholder || (language === "ru" ? "Выберите дату" : "Select date");
    }
    // Отображаем в формате ММ.ГГГГ (цифрами)
    return `${selectedMonth}.${selectedYear}`;
  };

  const styles = StyleSheet.create({
    container: {
      width: "100%",
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 2,
      borderColor: colors.primary + "40",
      borderRadius: 12,
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 16,
      minHeight: 56,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    inputText: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      marginRight: 8,
    },
    placeholderText: {
      flex: 1,
      fontSize: 16,
      color: colors.textSecondary,
      fontStyle: "italic",
      marginRight: 8,
    },
    icon: {
      marginLeft: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: Platform.OS === "ios" ? 34 : 20,
      maxHeight: "85%",
      width: "100%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      minHeight: 60,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      flex: 1,
      textAlign: "center",
      paddingHorizontal: 8,
    },
    cancelButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      minWidth: 80,
      alignItems: "flex-start",
      justifyContent: "center",
    },
    cancelButtonText: {
      fontSize: 16,
      color: colors.primary,
    },
    confirmButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      minWidth: 80,
      alignItems: "flex-end",
      justifyContent: "center",
    },
    confirmButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.primary,
    },
    pickerContainer: {
      flexDirection: "row",
      height: ITEM_HEIGHT * VISIBLE_ITEMS,
      backgroundColor: colors.surface,
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 16,
      justifyContent: "space-evenly",
      alignItems: "center",
    },
    pickerColumn: {
      flex: 1,
      position: "relative",
      minWidth: 140,
      maxWidth: 180,
      paddingHorizontal: 12,
      marginHorizontal: 4,
    },
    pickerScroll: {
      flex: 1,
    },
    pickerItem: {
      height: ITEM_HEIGHT,
      justifyContent: "center",
      alignItems: "center",
    },
    pickerItemText: {
      fontSize: 19,
      color: colors.text,
      textAlign: "center",
      paddingHorizontal: 4,
    },
    pickerItemTextSelected: {
      fontSize: 21,
      fontWeight: "600",
      color: colors.primary,
      textAlign: "center",
      paddingHorizontal: 4,
    },
    pickerSelection: {
      position: "absolute",
      top: ITEM_HEIGHT * 2,
      left: 0,
      right: 0,
      height: ITEM_HEIGHT,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.primary + "40",
      backgroundColor: colors.primary + "10",
      pointerEvents: "none",
    },
    pickerGradientTop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: ITEM_HEIGHT * 2,
      backgroundColor: colors.surface,
      opacity: 0.95,
      pointerEvents: "none",
    },
    pickerGradientBottom: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: ITEM_HEIGHT * 2,
      backgroundColor: colors.surface,
      opacity: 0.95,
      pointerEvents: "none",
    },
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.inputContainer}
        onPress={() => {
          console.log("📅 ExpiryDatePicker: Нажатие на поле выбора даты");
          setModalVisible(true);
        }}
        activeOpacity={0.6}
        accessible={true}
        accessibilityLabel={placeholder || (language === "ru" ? "Выбрать срок годности" : "Select expiry date")}
        accessibilityRole="button"
      >
        <Text
          style={[
            styles.inputText,
            selectedMonth && selectedYear ? { color: colors.text, fontWeight: "500" } : styles.placeholderText,
          ]}
          numberOfLines={1}
        >
          {displayValue()}
        </Text>
        <MaterialCommunityIcons
          name="calendar-month"
          size={26}
          color={colors.primary}
          style={styles.icon}
        />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={handleCancel}
          />
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>
                  {language === "ru" ? "Отмена" : "Cancel"}
                </Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {language === "ru" ? "Срок годности" : "Expiry Date"}
              </Text>
              <TouchableOpacity
                onPress={handleConfirm}
                style={styles.confirmButton}
                disabled={!selectedMonth || !selectedYear}
              >
                <Text
                  style={[
                    styles.confirmButtonText,
                    (!selectedMonth || !selectedYear) && { opacity: 0.5 },
                  ]}
                >
                  {language === "ru" ? "Готово" : "Done"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Picker */}
            <View style={styles.pickerContainer}>
              {/* Month Picker */}
              <View style={styles.pickerColumn}>
                <View style={styles.pickerSelection} />
                <View style={styles.pickerGradientTop} />
                <View style={styles.pickerGradientBottom} />
                <ScrollView
                  ref={monthScrollRef}
                  style={styles.pickerScroll}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  onMomentumScrollEnd={handleMonthScroll}
                  onScrollEndDrag={handleMonthScroll}
                  contentContainerStyle={{
                    paddingVertical: ITEM_HEIGHT * 2,
                  }}
                >
                  {months.map((month) => (
                    <View key={month.value} style={styles.pickerItem}>
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedMonth === month.value && styles.pickerItemTextSelected,
                        ]}
                      >
                        {month.label}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>

              {/* Year Picker */}
              <View style={styles.pickerColumn}>
                <View style={styles.pickerSelection} />
                <View style={styles.pickerGradientTop} />
                <View style={styles.pickerGradientBottom} />
                <ScrollView
                  ref={yearScrollRef}
                  style={styles.pickerScroll}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  onMomentumScrollEnd={handleYearScroll}
                  onScrollEndDrag={handleYearScroll}
                  contentContainerStyle={{
                    paddingVertical: ITEM_HEIGHT * 2,
                  }}
                >
                  {years.map((year) => (
                    <View key={year} style={styles.pickerItem}>
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedYear === year.toString() && styles.pickerItemTextSelected,
                        ]}
                      >
                        {year}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
