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

export async function registerApi(name: string, email: string, password: string) {
  // Логируем, что отправляем
  console.log("📤 REGISTER REQUEST:", { name, email, password: password ? "***" : undefined });
  
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
  
  const { data } = await api.post("/auth/register", { name, email, password });
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
    // Если это 404 или "User not found", возвращаем null
    if (error?.response?.status === 404 || error?.message?.includes("User not found")) {
      return null;
    }
    // Для других ошибок пробрасываем дальше
    throw error;
  }
}