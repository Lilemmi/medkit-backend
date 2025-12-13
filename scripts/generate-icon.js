#!/usr/bin/env node

/**
 * Скрипт для генерации PNG иконки из SVG
 * 
 * Использование:
 * 1. Установите зависимости: npm install sharp
 * 2. Запустите: node scripts/generate-icon.js
 * 
 * Или используйте онлайн-конвертер:
 * https://convertio.co/svg-png/
 * https://cloudconvert.com/svg-to-png
 */

const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../assets/images/icon.svg');
const outputPath = path.join(__dirname, '../assets/images/icon.png');

console.log('📱 Генерация иконки приложения...\n');

// Проверяем наличие SVG файла
if (!fs.existsSync(svgPath)) {
  console.error('❌ Файл icon.svg не найден!');
  process.exit(1);
}

console.log('✅ SVG файл найден');
console.log('📝 Для конвертации SVG в PNG используйте один из вариантов:\n');

console.log('Вариант 1: Онлайн-конвертер (самый простой)');
console.log('  1. Откройте: https://convertio.co/svg-png/');
console.log('  2. Загрузите файл: assets/images/icon.svg');
console.log('  3. Установите размер: 1024x1024px');
console.log('  4. Скачайте и сохраните как: assets/images/icon.png\n');

console.log('Вариант 2: Использование ImageMagick');
console.log('  convert -background none -size 1024x1024 assets/images/icon.svg assets/images/icon.png\n');

console.log('Вариант 3: Использование Sharp (Node.js)');
console.log('  npm install sharp');
console.log('  node -e "const sharp = require(\'sharp\'); sharp(\'assets/images/icon.svg\').resize(1024, 1024).png().toFile(\'assets/images/icon.png\')"\n');

console.log('После создания icon.png Expo автоматически сгенерирует все нужные размеры!');





