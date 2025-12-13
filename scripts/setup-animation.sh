#!/bin/bash

# Скрипт для настройки анимации splash screen
# Использование: ./scripts/setup-animation.sh [путь_к_файлу]

ANIMATION_DIR="assets/animations"
TARGET_FILE="$ANIMATION_DIR/splash-animation.json"

# Создаем папку, если её нет
mkdir -p "$ANIMATION_DIR"

# Если передан путь к файлу
if [ -n "$1" ]; then
    SOURCE_FILE="$1"
    if [ -f "$SOURCE_FILE" ]; then
        cp "$SOURCE_FILE" "$TARGET_FILE"
        echo "✅ Анимация скопирована в $TARGET_FILE"
    else
        echo "❌ Файл не найден: $SOURCE_FILE"
        exit 1
    fi
else
    # Ищем файл в папке dev
    if [ -d "dev" ]; then
        # Ищем JSON файлы в папке dev
        FOUND_FILE=$(find dev -name "*.json" -type f | head -1)
        if [ -n "$FOUND_FILE" ]; then
            cp "$FOUND_FILE" "$TARGET_FILE"
            echo "✅ Анимация найдена и скопирована из $FOUND_FILE в $TARGET_FILE"
        else
            echo "ℹ️  Файл анимации не найден в папке dev"
            echo "📝 Пожалуйста, поместите файл Lottie JSON в:"
            echo "   - $TARGET_FILE"
            echo "   - или в папку dev/ с любым именем .json"
        fi
    else
        echo "ℹ️  Папка dev не найдена"
        echo "📝 Пожалуйста, поместите файл Lottie JSON в: $TARGET_FILE"
    fi
fi

echo ""
echo "🎬 После добавления файла перезапустите приложение:"
echo "   npm start"







