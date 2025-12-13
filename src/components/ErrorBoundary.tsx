// 📌 ФАЙЛ: src/components/ErrorBoundary.tsx
// React Error Boundary для перехвата ошибок в компонентах

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { logError, formatErrorStack, getDeviceInfo } from '../utils/errorHandler';
import { useAuthStore } from '../store/authStore';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Получаем информацию о пользователе
    const user = useAuthStore.getState().user;

    // Логируем ошибку
    logError(error, {
      componentStack: errorInfo.componentStack || undefined,
      context: {
        errorBoundary: true,
        errorName: error.name,
      },
      userId: user?.id,
      email: user?.email,
    });

    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Если есть кастомный fallback, используем его
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Иначе показываем стандартный экран ошибки
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}

function ErrorFallback({ error, errorInfo, onReset }: ErrorFallbackProps) {
  const deviceInfo = getDeviceInfo();
  const errorStack = error ? formatErrorStack(error) : 'Unknown error';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <MaterialCommunityIcons name="alert-circle" size={64} color="#FF3B30" />
        <Text style={styles.title}>Что-то пошло не так</Text>
        <Text style={styles.subtitle}>
          Произошла ошибка в приложении. Мы уже работаем над её исправлением.
        </Text>

        {__DEV__ && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>🐛 Информация для отладки:</Text>
            <Text style={styles.debugLabel}>Ошибка:</Text>
            <Text style={styles.debugText}>{errorStack}</Text>

            {errorInfo?.componentStack && (
              <>
                <Text style={styles.debugLabel}>Компонент:</Text>
                <Text style={styles.debugText}>{errorInfo.componentStack}</Text>
              </>
            )}

            <Text style={styles.debugLabel}>Устройство:</Text>
            <Text style={styles.debugText}>
              {deviceInfo.platform} {deviceInfo.osVersion || ''} | App v{deviceInfo.appVersion}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={onReset}>
          <Text style={styles.buttonText}>Попробовать снова</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  debugContainer: {
    width: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD60A',
    marginBottom: 12,
  },
  debugLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 8,
    marginBottom: 4,
  },
  debugText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});










