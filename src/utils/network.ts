/**
 * Утилиты для проверки сетевого подключения
 */

/**
 * Проверяет доступность сети
 */
export async function isOnline(): Promise<boolean> {
  try {
    // Пытаемся сделать простой запрос к серверу API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    try {
      const response = await fetch("https://www.google.com", {
        method: "HEAD",
        mode: "no-cors",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      clearTimeout(timeoutId);
      const err: any = error;
      // Если это не ошибка отмены, значит сети нет
      if (err?.name !== "AbortError") {
        return false;
      }
      // Если таймаут - считаем что сети нет
      return false;
    }
  } catch (error) {
    const err: any = error;
    console.log("Network check error:", err);
    return false;
  }
}

