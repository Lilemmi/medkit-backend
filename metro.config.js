// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// JSON файлы должны обрабатываться как модули для включения в bundle
// Это важно для Lottie анимаций в production build
if (!config.resolver.sourceExts.includes('json')) {
  config.resolver.sourceExts.push('json');
}

module.exports = config;




