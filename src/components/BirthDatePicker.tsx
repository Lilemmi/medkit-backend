import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useColors } from "../theme/colors";

interface BirthDatePickerProps {
  value?: string; // Формат: "YYYY-MM-DD"
  onChange: (value: string) => void; // Возвращает "YYYY-MM-DD"
  placeholder?: string;
}

const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;

export default function BirthDatePicker({
  value,
  onChange,
  placeholder = "Выберите дату рождения",
}: BirthDatePickerProps) {
  const colors = useColors();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  
  const dayScrollRef = useRef<ScrollView>(null);
  const monthScrollRef = useRef<ScrollView>(null);
  const yearScrollRef = useRef<ScrollView>(null);

  // Дни месяца (1-31)
  const days = Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1).padStart(2, "0"),
    label: String(i + 1),
  }));

  // Месяцы
  const months = [
    { value: "01", label: "Январь" },
    { value: "02", label: "Февраль" },
    { value: "03", label: "Март" },
    { value: "04", label: "Апрель" },
    { value: "05", label: "Май" },
    { value: "06", label: "Июнь" },
    { value: "07", label: "Июль" },
    { value: "08", label: "Август" },
    { value: "09", label: "Сентябрь" },
    { value: "10", label: "Октябрь" },
    { value: "11", label: "Ноябрь" },
    { value: "12", label: "Декабрь" },
  ];

  // Годы (от 1900 до текущего года)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1899 }, (_, i) => ({
    value: String(currentYear - i),
    label: String(currentYear - i),
  }));

  // Инициализация из value
  useEffect(() => {
    if (value) {
      try {
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          const [year, month, day] = value.split("-");
          setSelectedYear(year);
          setSelectedMonth(month);
          setSelectedDay(day);
        } else {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            setSelectedYear(String(date.getFullYear()));
            setSelectedMonth(String(date.getMonth() + 1).padStart(2, "0"));
            setSelectedDay(String(date.getDate()).padStart(2, "0"));
          }
        }
      } catch (e) {
        console.error("Error parsing birthDate:", e);
      }
    } else {
      // Устанавливаем дату по умолчанию (18 лет назад)
      const defaultDate = new Date();
      defaultDate.setFullYear(defaultDate.getFullYear() - 18);
      setSelectedYear(String(defaultDate.getFullYear()));
      setSelectedMonth(String(defaultDate.getMonth() + 1).padStart(2, "0"));
      setSelectedDay(String(defaultDate.getDate()).padStart(2, "0"));
    }
  }, [value]);

  // Прокрутка к выбранному элементу при открытии модального окна
  useEffect(() => {
    if (modalVisible) {
      setTimeout(() => {
        // Прокрутка дня
        if (selectedDay) {
          const dayIndex = days.findIndex((d) => d.value === selectedDay);
          if (dayIndex >= 0 && dayScrollRef.current) {
            dayScrollRef.current.scrollTo({
              y: dayIndex * ITEM_HEIGHT,
              animated: false,
            });
          }
        }
        
        // Прокрутка месяца
        if (selectedMonth) {
          const monthIndex = months.findIndex((m) => m.value === selectedMonth);
          if (monthIndex >= 0 && monthScrollRef.current) {
            monthScrollRef.current.scrollTo({
              y: monthIndex * ITEM_HEIGHT,
              animated: false,
            });
          }
        }
        
        // Прокрутка года
        if (selectedYear) {
          const yearIndex = years.findIndex((y) => y.value === selectedYear);
          if (yearIndex >= 0 && yearScrollRef.current) {
            yearScrollRef.current.scrollTo({
              y: yearIndex * ITEM_HEIGHT,
              animated: false,
            });
          }
        }
      }, 300);
    }
  }, [modalVisible]);

  const handleDayScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(Math.round(y / ITEM_HEIGHT), days.length - 1));
    const newDay = days[index]?.value;
    if (newDay && newDay !== selectedDay) {
      setSelectedDay(newDay);
    }
  };

  const handleMonthScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(Math.round(y / ITEM_HEIGHT), months.length - 1));
    const newMonth = months[index]?.value;
    if (newMonth && newMonth !== selectedMonth) {
      setSelectedMonth(newMonth);
    }
  };

  const handleYearScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(Math.round(y / ITEM_HEIGHT), years.length - 1));
    const newYear = years[index]?.value;
    if (newYear && newYear !== selectedYear) {
      setSelectedYear(newYear);
    }
  };

  const handleConfirm = () => {
    if (selectedDay && selectedMonth && selectedYear) {
      const formattedDate = `${selectedYear}-${selectedMonth}-${selectedDay}`;
      const date = new Date(formattedDate);
      if (!isNaN(date.getTime())) {
        onChange(formattedDate);
        setModalVisible(false);
      } else {
        Alert.alert("Ошибка", "Выбрана неверная дата. Пожалуйста, выберите корректную дату.");
      }
    } else {
      Alert.alert("Ошибка", "Пожалуйста, выберите день, месяц и год.");
    }
  };

  const handleCancel = () => {
    // Восстанавливаем исходное значение
    if (value) {
      try {
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          const [year, month, day] = value.split("-");
          setSelectedYear(year);
          setSelectedMonth(month);
          setSelectedDay(day);
        }
      } catch (e) {
        // Игнорируем ошибки
      }
    }
    setModalVisible(false);
  };

  const displayValue = value
    ? (() => {
        try {
          if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const [year, month, day] = value.split("-");
            const monthName = months[parseInt(month) - 1]?.label || month;
            return `${day}.${month}.${year}`;
          }
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            const day = String(date.getDate()).padStart(2, "0");
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const year = date.getFullYear();
            const monthName = months[parseInt(month) - 1]?.label || month;
            return `${day}.${month}.${year}`;
          }
        } catch (e) {
          // Игнорируем ошибки
        }
        return value;
      })()
    : placeholder;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border || "#D1D1D6",
      borderRadius: 12,
      backgroundColor: colors.surface || "#fff",
      paddingHorizontal: 16,
      paddingVertical: 14,
      minHeight: 50,
    },
    inputText: {
      flex: 1,
      fontSize: 16,
      color: colors.text || "#000",
    },
    placeholderText: {
      fontSize: 16,
      color: colors.textSecondary || "#888",
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
      backgroundColor: colors.surface || "#fff",
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 20,
      maxHeight: "70%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border || "#D1D1D6",
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text || "#000",
    },
    cancelButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    cancelButtonText: {
      fontSize: 16,
      color: colors.primary || "#007AFF",
    },
    confirmButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    confirmButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.primary || "#007AFF",
    },
    pickerContainer: {
      flexDirection: "row",
      height: ITEM_HEIGHT * VISIBLE_ITEMS,
      backgroundColor: colors.surface || "#fff",
    },
    pickerColumn: {
      flex: 1,
      position: "relative",
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
      fontSize: 20,
      color: colors.text || "#000",
    },
    pickerItemTextSelected: {
      fontSize: 22,
      fontWeight: "600",
      color: colors.primary || "#007AFF",
    },
    pickerSelection: {
      position: "absolute",
      top: ITEM_HEIGHT * 2,
      left: 0,
      right: 0,
      height: ITEM_HEIGHT,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.primary + "40" || "#007AFF40",
      backgroundColor: colors.primary + "10" || "#007AFF10",
      pointerEvents: "none",
      zIndex: 2,
    },
    pickerGradientTop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: ITEM_HEIGHT * 2,
      backgroundColor: colors.surface || "#fff",
      opacity: 0.95,
      pointerEvents: "none",
      zIndex: 1,
    },
    pickerGradientBottom: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: ITEM_HEIGHT * 2,
      backgroundColor: colors.surface || "#fff",
      opacity: 0.95,
      pointerEvents: "none",
      zIndex: 1,
    },
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.inputContainer}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            value ? styles.inputText : styles.placeholderText,
          ]}
        >
          {displayValue}
        </Text>
        <MaterialCommunityIcons
          name="calendar"
          size={24}
          color={colors.primary || "#007AFF"}
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
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Дата рождения</Text>
              <TouchableOpacity
                onPress={handleConfirm}
                style={styles.confirmButton}
                disabled={!selectedDay || !selectedMonth || !selectedYear}
              >
                <Text
                  style={[
                    styles.confirmButtonText,
                    (!selectedDay || !selectedMonth || !selectedYear) && { opacity: 0.5 },
                  ]}
                >
                  Готово
                </Text>
              </TouchableOpacity>
            </View>

            {/* Picker */}
            <View style={styles.pickerContainer}>
              {/* Day Picker */}
              <View style={styles.pickerColumn}>
                <View style={styles.pickerSelection} />
                <View style={styles.pickerGradientTop} />
                <View style={styles.pickerGradientBottom} />
                <ScrollView
                  ref={dayScrollRef}
                  style={styles.pickerScroll}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  onMomentumScrollEnd={handleDayScroll}
                  onScrollEndDrag={handleDayScroll}
                  contentContainerStyle={{
                    paddingVertical: ITEM_HEIGHT * 2,
                  }}
                >
                  {days.map((day) => (
                    <View key={day.value} style={styles.pickerItem}>
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedDay === day.value && styles.pickerItemTextSelected,
                        ]}
                      >
                        {day.label}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>

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
                    <View key={year.value} style={styles.pickerItem}>
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedYear === year.value && styles.pickerItemTextSelected,
                        ]}
                      >
                        {year.label}
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
