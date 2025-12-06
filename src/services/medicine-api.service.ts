// Сервис для получения состава лекарства через API
// В реальном приложении здесь будет запрос к API базы данных лекарств

export interface MedicineIngredients {
  activeIngredients: string[]; // Активные ингредиенты
  inactiveIngredients?: string[]; // Вспомогательные вещества
}

/**
 * Получить состав лекарства по названию
 * @param medicineName - Название лекарства
 * @returns Состав лекарства (активные и вспомогательные вещества)
 */
export async function getMedicineIngredients(medicineName: string): Promise<MedicineIngredients> {
  try {
    // TODO: В реальном приложении здесь будет запрос к API базы данных лекарств
    // Например: https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${medicineName}"
    // Или другой API для получения состава лекарств
    
    // Пока используем mock данные для демонстрации
    // В реальности нужно подключить API, например:
    // const response = await api.get(`/medicines/ingredients?name=${encodeURIComponent(medicineName)}`);
    // return response.data;
    
    return mockGetIngredients(medicineName);
  } catch (error) {
    console.error("Error fetching medicine ingredients:", error);
    // Возвращаем пустой состав при ошибке
    return { activeIngredients: [], inactiveIngredients: [] };
  }
}

/**
 * Mock функция для получения состава лекарства
 * В реальном приложении заменить на реальный API запрос
 */
function mockGetIngredients(medicineName: string): MedicineIngredients {
  const name = medicineName.toLowerCase();
  
  // Примеры известных лекарств и их состав
  const medicineDatabase: Record<string, MedicineIngredients> = {
    "ибупрофен": {
      activeIngredients: ["ибупрофен"],
      inactiveIngredients: ["крахмал", "целлюлоза", "магния стеарат"],
    },
    "парацетамол": {
      activeIngredients: ["парацетамол"],
      inactiveIngredients: ["крахмал", "лактоза", "желатин"],
    },
    "аспирин": {
      activeIngredients: ["ацетилсалициловая кислота"],
      inactiveIngredients: ["крахмал", "целлюлоза"],
    },
    "амоксициллин": {
      activeIngredients: ["амоксициллин"],
      inactiveIngredients: ["крахмал", "магния стеарат"],
    },
    "пенициллин": {
      activeIngredients: ["пенициллин"],
      inactiveIngredients: ["натрия хлорид", "вода"],
    },
  };
  
  // Ищем точное совпадение
  if (medicineDatabase[name]) {
    return medicineDatabase[name];
  }
  
  // Ищем частичное совпадение
  for (const [key, value] of Object.entries(medicineDatabase)) {
    if (name.includes(key) || key.includes(name)) {
      return value;
    }
  }
  
  // Если не найдено, возвращаем пустой состав
  // В реальном приложении здесь должен быть запрос к API
  return {
    activeIngredients: [],
    inactiveIngredients: [],
  };
}




