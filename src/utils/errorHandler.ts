// 📌 ФАЙЛ: src/utils/errorHandler.ts
// Утилита для обработки ошибок, логирования и мониторинга

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Глобальная обработка необработанных ошибок
if (typeof global !== 'undefined' && typeof ErrorUtils !== 'undefined') {
  try {
    const originalErrorHandler = (ErrorUtils as any).getGlobalHandler?.();
    
    (ErrorUtils as any).setGlobalHandler?.((error: Error, isFatal?: boolean) => {
      logError(error, {
        context: {
          isFatal: isFatal || false,
          unhandled: true,
        },
      });
      
      // Вызываем оригинальный обработчик
      if (originalErrorHandler) {
        originalErrorHandler(error, isFatal);
      }
    });
  } catch (e) {
    // Игнорируем ошибки при настройке глобального обработчика
    console.warn('Failed to set global error handler:', e);
  }
}

export interface ErrorInfo {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  deviceInfo: {
    platform: string;
    osVersion?: string;
    deviceName?: string;
    appVersion?: string;
  };
  userInfo?: {
    userId?: number;
    email?: string;
  };
  context?: Record<string, any>;
}

// 📊 Хранилище ошибок (можно заменить на отправку в Sentry/другой сервис)
const errorLog: ErrorInfo[] = [];
const MAX_ERROR_LOG_SIZE = 100;

/**
 * Логирование ошибки с полной информацией
 */
export function logError(
  error: Error | string,
  errorInfo?: {
    componentStack?: string;
    context?: Record<string, any>;
    userId?: number;
    email?: string;
    quiet?: boolean; // Флаг для тихого логирования (без полного стека)
  }
): ErrorInfo {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'string' ? undefined : error.stack;

  const errorData: ErrorInfo = {
    message: errorMessage,
    stack: errorStack,
    componentStack: errorInfo?.componentStack,
    timestamp: new Date().toISOString(),
  deviceInfo: {
    platform: Platform.OS || 'unknown',
    osVersion: Platform.Version ? String(Platform.Version) : undefined,
    deviceName: undefined, // Можно добавить expo-device для получения имени устройства
    appVersion: Constants.expoConfig?.version || '1.0.0',
  },
    userInfo: errorInfo?.userId
      ? {
          userId: errorInfo.userId,
          email: errorInfo.email,
        }
      : undefined,
    context: errorInfo?.context,
  };

  // Добавляем в лог
  errorLog.push(errorData);
  if (errorLog.length > MAX_ERROR_LOG_SIZE) {
    errorLog.shift(); // Удаляем старые ошибки
  }

  // Логируем в консоль
  if (errorInfo?.quiet) {
    // Тихий режим - только краткое сообщение
    console.log(`⚠️ ${errorData.message}`);
  } else {
    // Полное логирование с стеком
    console.error('🚨 ERROR LOGGED:', {
      message: errorData.message,
      stack: errorData.stack,
      timestamp: errorData.timestamp,
      device: errorData.deviceInfo,
      user: errorData.userInfo,
      context: errorData.context,
    });
  }

  // TODO: Здесь можно добавить отправку в Sentry, Crashlytics и т.д.
  // Пример:
  // if (__DEV__) {
  //   // В dev режиме только логируем
  // } else {
  //   // В production отправляем в сервис мониторинга
  //   sendToErrorTracking(errorData);
  // }

  return errorData;
}

/**
 * Получить все залогированные ошибки
 */
export function getErrorLog(): ErrorInfo[] {
  return [...errorLog];
}

/**
 * Очистить лог ошибок
 */
export function clearErrorLog(): void {
  errorLog.length = 0;
}

/**
 * Форматирование стека ошибки для отображения
 */
export function formatErrorStack(error: Error | string): string {
  if (typeof error === 'string') {
    return error;
  }

  if (!error.stack) {
    return error.message || 'Unknown error';
  }

  // Улучшаем читаемость стека
  return error.stack
    .split('\n')
    .map((line, index) => {
      // Выделяем важные строки
      if (index === 0) {
        return `❌ ${line}`;
      }
      // Подсвечиваем строки с файлами
      if (line.includes('at ') && (line.includes('.tsx') || line.includes('.ts') || line.includes('.js'))) {
        return `   📍 ${line.trim()}`;
      }
      return `   ${line}`;
    })
    .join('\n');
}

/**
 * Проверка, является ли ошибка критической
 */
export function isCriticalError(error: Error): boolean {
  const criticalPatterns = [
    /network/i,
    /timeout/i,
    /unauthorized/i,
    /forbidden/i,
    /not found/i,
    /database/i,
    /sql/i,
  ];

  return criticalPatterns.some((pattern) => pattern.test(error.message));
}

/**
 * Получить информацию об устройстве для отладки
 */
export function getDeviceInfo(): ErrorInfo['deviceInfo'] {
  return {
    platform: Platform.OS || 'unknown',
    osVersion: Platform.Version ? String(Platform.Version) : undefined,
    deviceName: undefined, // Можно добавить expo-device для получения имени устройства
    appVersion: Constants.expoConfig?.version || '1.0.0',
  };
}

