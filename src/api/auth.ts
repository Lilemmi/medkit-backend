import { api } from "./api";

export async function loginApi(email: string, password: string) {
  // Логируем, что отправляем
  console.log("📤 LOGIN REQUEST:", { email, password: password ? "***" : undefined });
  
  // Проверяем, что email и password не undefined
  if (!email || email === undefined) {
    throw new Error("Email is required");
  }
  if (!password || password === undefined) {
    throw new Error("Password is required");
  }
  
  const { data } = await api.post("/auth/login", { email, password });
  return data;  // { user, token }
}

export async function registerApi(
  name: string,
  email: string,
  password: string,
  gender: string,
  allergies: string,
  birthDate: string
) {
  // Логируем, что отправляем
  console.log("📤 REGISTER REQUEST:", { name, email, password: password ? "***" : undefined, gender, allergies, birthDate });
  
  // Проверяем, что все поля не undefined
  if (!name || name === undefined) {
    throw new Error("Name is required");
  }
  if (!email || email === undefined) {
    throw new Error("Email is required");
  }
  if (!password || password === undefined) {
    throw new Error("Password is required");
  }
  if (!gender || gender === undefined) {
    throw new Error("Gender is required");
  }
  if (!allergies || allergies === undefined) {
    throw new Error("Allergies is required");
  }
  if (!birthDate || birthDate === undefined) {
    throw new Error("Birth date is required");
  }
  
  // Проверяем формат даты (должен быть YYYY-MM-DD)
  let formattedBirthDate = birthDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(formattedBirthDate)) {
    // Если формат другой, пытаемся преобразовать
    try {
      const date = new Date(formattedBirthDate);
      if (!isNaN(date.getTime())) {
        formattedBirthDate = date.toISOString().split('T')[0];
        console.log("📅 Date converted to ISO format:", formattedBirthDate);
      } else {
        console.error("❌ Invalid date format:", formattedBirthDate);
        throw new Error("Invalid date format");
      }
    } catch (e) {
      console.error("❌ Date parsing error:", e);
      throw new Error("Birth date must be in YYYY-MM-DD format");
    }
  }
  
  // Дополнительная валидация даты
  const dateParts = formattedBirthDate.split('-');
  if (dateParts.length !== 3) {
    throw new Error("Birth date must be in YYYY-MM-DD format");
  }
  const [year, month, day] = dateParts.map(Number);
  if (year < 1900 || year > new Date().getFullYear() || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error("Invalid date values");
  }
  
  // Обрезаем пробелы и нормализуем данные
  const cleanData = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: password.trim(),
    gender: gender.trim(),
    allergies: allergies.trim(),
    birthDate: formattedBirthDate,
  };

  console.log("📤 REGISTER REQUEST (cleaned):", { 
    ...cleanData, 
    password: cleanData.password ? "***" : undefined 
  });

  const { data } = await api.post("/auth/register", cleanData);
  return data; // { user, token }
}

export async function fetchProfileApi() {
  try {
    const { data } = await api.get("/users/profile");
    // Если сервер вернул ошибку
    if (data?.error) {
      throw new Error(data.error);
    }
    // Возвращаем user напрямую, если data содержит user, иначе возвращаем data
    return data?.user || data;
  } catch (error: any) {
    const status = error?.response?.status;
    
    // Если это 404 или "User not found", возвращаем null
    if (status === 404 || error?.message?.includes("User not found")) {
      return null;
    }
    
    // Если сервер недоступен (502, 503, 504), не пробрасываем ошибку
    // Позволяем приложению работать в офлайн режиме
    if (status === 502 || status === 503 || status === 504) {
      console.log(`⚠️ Сервер недоступен (${status}), работаем офлайн`);
      // Возвращаем null, чтобы не блокировать работу приложения
      // Токен остается, пользователь может работать локально
      return null;
    }
    
    // Для других ошибок пробрасываем дальше
    throw error;
  }
}

// 🔑 Запрос на восстановление пароля (отправка кода на email)
export async function forgotPasswordApi(email: string) {
  console.log("📤 FORGOT PASSWORD REQUEST:", { email });
  
  if (!email || email === undefined) {
    throw new Error("Email is required");
  }
  
  const { data } = await api.post("/auth/forgot-password", { email });
  return data;
}

// 🔐 Сброс пароля с кодом подтверждения
export async function resetPasswordApi(email: string, code: string, newPassword: string) {
  console.log("📤 RESET PASSWORD REQUEST:", { email, code: code ? "***" : undefined, newPassword: newPassword ? "***" : undefined });
  
  if (!email || email === undefined) {
    throw new Error("Email is required");
  }
  if (!code || code === undefined) {
    throw new Error("Code is required");
  }
  if (!newPassword || newPassword === undefined) {
    throw new Error("New password is required");
  }
  
  const { data } = await api.post("/auth/reset-password", { 
    email, 
    code, 
    newPassword 
  });
  return data;
}