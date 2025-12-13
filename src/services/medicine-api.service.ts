// Сервис для получения состава лекарства через API
// В реальном приложении здесь будет запрос к API базы данных лекарств

export interface MedicineIngredients {
  activeIngredients: string[]; // Активные ингредиенты
  inactiveIngredients?: string[]; // Вспомогательные вещества
}

/**
 * Получить состав лекарства по названию
 * @param medicineName - Название лекарства
 * @param activeIngredientsFromDB - Активные ингредиенты из базы данных (если есть)
 * @returns Состав лекарства (активные и вспомогательные вещества)
 */
export async function getMedicineIngredients(
  medicineName: string,
  activeIngredientsFromDB?: string[] | any
): Promise<MedicineIngredients> {
  try {
    // Если есть активные ингредиенты из базы данных, используем их
    if (activeIngredientsFromDB && Array.isArray(activeIngredientsFromDB) && activeIngredientsFromDB.length > 0) {
      return {
        activeIngredients: activeIngredientsFromDB.map((ing: any) => {
          // Если это объект с полем name, извлекаем название
          if (ing && typeof ing === 'object' && ing.name) {
            return String(ing.name);
          }
          return typeof ing === 'string' ? ing : String(ing);
        }),
        inactiveIngredients: []
      };
    }

    // Если activeIngredientsFromDB это JSON строка, парсим её
    if (activeIngredientsFromDB && typeof activeIngredientsFromDB === 'string') {
      try {
        const parsed = JSON.parse(activeIngredientsFromDB);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return {
            activeIngredients: parsed.map((ing: any) => {
              // Если это объект с полем name, извлекаем название
              if (ing && typeof ing === 'object' && ing.name) {
                return String(ing.name);
              }
              return String(ing);
            }),
            inactiveIngredients: []
          };
        }
      } catch (e) {
        // Если не JSON, игнорируем
      }
    }

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










