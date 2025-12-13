/**
 * Форматирует дату срока годности в формат ММ.ГГГГ (только месяц и год)
 * @param expiry - Дата в формате YYYY-MM-DD или ММ.ГГГГ
 * @returns Строка в формате ММ.ГГГГ или пустая строка
 */
export function formatExpiryDate(expiry: string | null | undefined): string {
  if (!expiry || expiry.trim() === "") return "";

  // Если уже в формате ММ.ГГГГ, возвращаем как есть
  if (/^\d{2}\.\d{4}$/.test(expiry.trim())) {
    return expiry.trim();
  }

  // Если в формате YYYY-MM-DD, преобразуем в ММ.ГГГГ
  if (/^\d{4}-\d{2}-\d{2}$/.test(expiry.trim())) {
    try {
      const date = new Date(expiry);
      if (!isNaN(date.getTime())) {
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${month}.${year}`;
      }
    } catch (error) {
      console.error("Error formatting expiry date:", error);
    }
  }

  // Если формат не распознан, пытаемся распарсить как дату
  try {
    const date = new Date(expiry);
    if (!isNaN(date.getTime())) {
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${month}.${year}`;
    }
  } catch (error) {
    console.error("Error parsing expiry date:", error);
  }

  // Если ничего не получилось, возвращаем как есть
  return expiry.trim();
}

/**
 * Преобразует дату в формате ММ.ГГГГ в полную дату (последний день месяца) в формате YYYY-MM-DD
 * @param monthYear - Дата в формате ММ.ГГГГ, ММ-ГГГГ или ММ/ГГГГ
 * @returns Дата в формате YYYY-MM-DD или null если невалидно
 */
export function convertMonthYearToFullDate(monthYear: string): string | null {
  if (!monthYear || monthYear.trim() === "" || monthYear === ".") return null;
  
  // Поддерживаем форматы: ММ.ГГГГ, ММ-ГГГГ, ММ/ГГГГ
  const cleaned = monthYear.trim().replace(/[.\-\/]/g, ".");
  const parts = cleaned.split(".").filter(p => p !== "");
  
  if (parts.length !== 2) {
    // Если формат не ММ.ГГГГ, возвращаем null
    return null;
  }
  
  const month = parseInt(parts[0]);
  const year = parseInt(parts[1]);
  
  if (isNaN(month) || isNaN(year) || month < 1 || month > 12 || year < 2000 || year > 2100) {
    return null; // Возвращаем null, если невалидно
  }
  
  // Получаем последний день месяца
  const lastDay = new Date(year, month, 0).getDate();
  
  // Форматируем как ГГГГ-ММ-ДД
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}






