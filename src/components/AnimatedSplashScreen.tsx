import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import * as SplashScreen from 'expo-splash-screen';

const { width, height } = Dimensions.get('window');

interface AnimatedSplashScreenProps {
  onAnimationFinish?: () => void;
  animationSource?: any; // Lottie animation JSON или require path
}

export const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({
  onAnimationFinish,
  animationSource,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    // Плавное появление анимации
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Запускаем Lottie анимацию с небольшой задержкой для стабильности
    const timer = setTimeout(() => {
      try {
        if (lottieRef.current && animationSource) {
          lottieRef.current.play();
        }
      } catch (error) {
        console.log("⚠️ Ошибка воспроизведения Lottie анимации:", error);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [animationSource]);

  const handleAnimationFinish = () => {
    // Уведомляем о завершении анимации (но не скрываем splash здесь)
    try {
      onAnimationFinish?.();
    } catch (error) {
      console.log("⚠️ Ошибка в handleAnimationFinish:", error);
    }
  };

  // Если анимация не загружена, показываем статичный splash
  if (!animationSource) {
    return (
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.logoPlaceholder} />
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {animationSource ? (
          <LottieView
            ref={lottieRef}
            source={animationSource}
            style={styles.animation}
            loop={true}
            autoPlay={true}
            speed={1}
            renderMode="SOFTWARE"
            hardwareAccelerationAndroid={true}
            onAnimationFailure={(error) => {
              console.log("⚠️ Ошибка воспроизведения Lottie:", error);
              console.log("⚠️ Animation source type:", typeof animationSource);
              console.log("⚠️ Animation source keys:", animationSource ? Object.keys(animationSource).slice(0, 10) : "null");
              // При ошибке просто вызываем callback
              handleAnimationFinish();
            }}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.logoPlaceholder} />
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F4FE', // Цвет фона из app.json
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: width * 0.6,
    height: width * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animation: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1D9BF0',
    opacity: 0.3,
  },
});

