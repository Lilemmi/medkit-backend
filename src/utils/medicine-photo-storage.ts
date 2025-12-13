// 📸 Сервис для сохранения фотографий лекарств в постоянной папке на устройстве

import { Platform } from 'react-native';

// Динамический импорт expo-file-system для проверки доступности
// Используем legacy API для обратной совместимости
let FileSystem: any = null;
let documentDirectory: string | null = null;
let cacheDirectory: string | null = null;

try {
  // Используем legacy API для избежания предупреждений о deprecated методах
  FileSystem = require('expo-file-system/legacy');
  // Пытаемся получить директории сразу при импорте
  documentDirectory = FileSystem.documentDirectory || null;
  cacheDirectory = FileSystem.cacheDirectory || null;
  
  // Если директории недоступны, это нормально для dev builds
  // Приложение будет работать с оригинальными URI
  if (!documentDirectory && !cacheDirectory) {
    console.log('⚠️ documentDirectory и cacheDirectory недоступны (возможно, dev build). Фотографии будут использовать оригинальные URI.');
  }
} catch (error) {
  console.log('⚠️ expo-file-system не доступен:', error);
}

// Опциональный импорт MediaLibrary (требует пересборки нативного приложения)
let MediaLibrary: any = null;
try {
  MediaLibrary = require('expo-media-library');
} catch (error) {
  console.log('⚠️ expo-media-library не доступен (требуется пересборка приложения)');
}

// ----------------------------------------------------
// 📁 ПОЛУЧИТЬ ПУТЬ К ПОСТОЯННОЙ ПАПКЕ ДЛЯ ФОТОГРАФИЙ ЛЕКАРСТВ
// ----------------------------------------------------
export async function getMedicinePhotosDirectory(): Promise<string | null> {
  // Проверяем, доступен ли FileSystem
  if (!FileSystem) {
    console.error('❌ expo-file-system не доступен');
    throw new Error('expo-file-system не доступен. Убедитесь, что модуль установлен и приложение пересобрано.');
  }

  try {
    // Для Android используем постоянную директорию в Documents
    // Для iOS используем постоянную директорию в Documents
    // Проверяем доступность директорий
    let baseDir: string | null = null;
    
    // Пытаемся получить documentDirectory
    // В dev builds эти константы могут быть undefined
    if (documentDirectory) {
      baseDir = documentDirectory;
    } 
    // Если documentDirectory недоступен, используем cacheDirectory
    else if (cacheDirectory) {
      baseDir = cacheDirectory;
      console.log('⚠️ documentDirectory недоступен, используем cacheDirectory');
    }
    // Пробуем получить из FileSystem напрямую (на случай, если они стали доступны)
    else if (FileSystem.documentDirectory) {
      baseDir = FileSystem.documentDirectory;
      documentDirectory = baseDir; // Кэшируем для будущего использования
    }
    else if (FileSystem.cacheDirectory) {
      baseDir = FileSystem.cacheDirectory;
      cacheDirectory = baseDir; // Кэшируем для будущего использования
      console.log('⚠️ documentDirectory недоступен, используем cacheDirectory');
    }
    
    // Если оба null, это нормально для dev builds - просто возвращаем ошибку без выбрасывания
    // Приложение будет использовать оригинальные URI
    if (!baseDir) {
      // Не выбрасываем ошибку, просто возвращаем null - вызывающий код обработает это
      console.log('⚠️ documentDirectory и cacheDirectory недоступны (dev build). Фотографии будут использовать оригинальные URI.');
      return null as any; // Возвращаем null, чтобы вызывающий код мог обработать это
    }

    // Создаем папку для фотографий лекарств
    const photosDir = `${baseDir}medicine_photos/`;
    
    // Проверяем, существует ли папка
    try {
      const dirInfo = await FileSystem.getInfoAsync(photosDir);
      if (!dirInfo.exists) {
        // Создаем папку, если её нет
        await FileSystem.makeDirectoryAsync(photosDir, { intermediates: true });
        console.log('✅ Создана папка для фотографий лекарств:', photosDir);
      }
    } catch (dirError) {
      console.error('Ошибка создания/проверки папки для фотографий:', dirError);
      // Продолжаем работу, даже если не удалось создать папку
      // Возможно, папка уже существует или будет создана позже
    }

    return photosDir;
  } catch (error) {
    console.error('Ошибка получения директории для фотографий:', error);
    // Последняя попытка - проверяем cacheDirectory еще раз
    if (FileSystem?.cacheDirectory) {
      const fallbackDir = `${FileSystem.cacheDirectory}medicine_photos/`;
      console.log('⚠️ Используем fallback директорию:', fallbackDir);
      return fallbackDir;
    }
    // Если все fallback варианты недоступны, возвращаем null (не выбрасываем ошибку)
    console.log('⚠️ Все fallback варианты недоступны. Фотографии будут использовать оригинальные URI.');
    return null as any;
  }
}

// ----------------------------------------------------
// 💾 СОХРАНИТЬ ФОТОГРАФИЮ ЛЕКАРСТВА В ПОСТОЯННУЮ ПАПКУ
// ----------------------------------------------------
export async function saveMedicinePhoto(
  sourceUri: string,
  medicineId: number,
  userId: number
): Promise<string | null> {
  // Проверяем доступность FileSystem
  if (!FileSystem) {
    console.warn('⚠️ expo-file-system не доступен, возвращаем оригинальный URI');
    return sourceUri;
  }

  try {
    // Получаем директорию для фотографий
    let photosDir: string | null = null;
    try {
      photosDir = await getMedicinePhotosDirectory();
    } catch (dirError) {
      console.error('⚠️ Не удалось получить директорию для фотографий:', dirError);
      // Возвращаем оригинальный URI, если не удалось получить директорию
      return sourceUri;
    }
    
    // Если директория недоступна (dev build), возвращаем оригинальный URI
    if (!photosDir) {
      return sourceUri;
    }
    
    // Создаем уникальное имя файла: userId_medicineId_timestamp.jpg
    const timestamp = Date.now();
    const fileName = `medicine_${userId}_${medicineId}_${timestamp}.jpg`;
    const destinationUri = `${photosDir}${fileName}`;

    // Копируем файл из временной директории в постоянную
    await FileSystem.copyAsync({
      from: sourceUri,
      to: destinationUri,
    });

    console.log(`✅ Фотография лекарства сохранена: ${destinationUri}`);
    return destinationUri;
  } catch (error) {
    console.error('Ошибка сохранения фотографии лекарства:', error);
    // Возвращаем оригинальный URI как fallback
    return sourceUri;
  }
}

// ----------------------------------------------------
// 📸 СОХРАНИТЬ ФОТОГРАФИЮ В ГАЛЕРЕЮ И ПОЛУЧИТЬ URI
// ----------------------------------------------------
export async function saveMedicinePhotoToGallery(
  sourceUri: string,
  medicineId: number,
  userId: number
): Promise<string | null> {
  // Если MediaLibrary не доступен, просто сохраняем в постоянную папку
  if (!MediaLibrary) {
    console.log('⚠️ MediaLibrary не доступен, сохраняем только в постоянную папку');
    return await saveMedicinePhoto(sourceUri, medicineId, userId);
  }

  try {
    // Запрашиваем разрешение на доступ к медиатеке
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('⚠️ Разрешение на доступ к медиатеке не предоставлено');
      // Если разрешение не предоставлено, сохраняем в постоянную папку приложения
      return await saveMedicinePhoto(sourceUri, medicineId, userId);
    }

    // Сохраняем в галерею
    const asset = await MediaLibrary.createAssetAsync(sourceUri);
    
    // Создаем альбом для фотографий лекарств, если его нет
    let album = await MediaLibrary.getAlbumAsync('MedKit - Лекарства');
    if (!album) {
      album = await MediaLibrary.createAlbumAsync('MedKit - Лекарства', asset, false);
    } else {
      // Добавляем фото в существующий альбом
      await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
    }

    // Возвращаем URI из галереи
    // asset.uri уже содержит правильный URI (content:// для Android, file:// для iOS)
    const photoUri = asset.uri;

    console.log(`✅ Фотография сохранена в галерею: ${photoUri}`);
    
    // Для Android: asset.uri может быть временным или недоступным
    // Лучше использовать оригинальный sourceUri, который гарантированно доступен
    // Также сохраняем копию в постоянную папку приложения для надежности
    const localCopy = await saveMedicinePhoto(sourceUri, medicineId, userId);
    
    // Для Android: используем оригинальный URI или локальную копию
    // asset.uri может быть недоступен после сохранения
    if (Platform.OS === 'android') {
      // Используем локальную копию, если она была создана, иначе оригинальный URI
      return localCopy || sourceUri;
    }
    
    // Для iOS: используем URI из галереи или локальную копию
    return photoUri || localCopy || sourceUri;
  } catch (error) {
    console.error('Ошибка сохранения фотографии в галерею:', error);
    // Fallback: сохраняем в постоянную папку приложения
    return await saveMedicinePhoto(sourceUri, medicineId, userId);
  }
}

// ----------------------------------------------------
// 🔍 ПРОВЕРИТЬ СУЩЕСТВОВАНИЕ ФОТОГРАФИИ
// ----------------------------------------------------
export async function checkPhotoExists(photoUri: string): Promise<boolean> {
  try {
    if (!photoUri || photoUri.trim() === '') {
      return false;
    }

    // Если это URL из интернета, считаем что существует
    if (photoUri.startsWith('http://') || photoUri.startsWith('https://')) {
      return true;
    }

    // Если FileSystem не доступен, считаем что локальные файлы существуют
    if (!FileSystem) {
      return true; // Оптимистично предполагаем, что файл существует
    }

    // Если это локальный путь, проверяем существование файла
    if (photoUri.startsWith('file://') || photoUri.startsWith('/')) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(photoUri);
        return fileInfo.exists;
      } catch (error) {
        console.error('Ошибка проверки файла:', error);
        return false;
      }
    }

    // Если это content:// URI (Android галерея), считаем что существует
    if (photoUri.startsWith('content://')) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Ошибка проверки существования фотографии:', error);
    return false;
  }
}

// ----------------------------------------------------
// 🔄 МИГРАЦИЯ СУЩЕСТВУЮЩИХ ФОТОГРАФИЙ
// ----------------------------------------------------
export async function migrateExistingPhotos(
  medicines: { id: number; photoUri: string | null; userId: number }[]
): Promise<void> {
  try {
    // Пытаемся получить директорию для фотографий
    let photosDir: string | null;
    try {
      photosDir = await getMedicinePhotosDirectory();
    } catch (dirError) {
      console.error('⚠️ Не удалось получить директорию для фотографий, пропускаем миграцию:', dirError);
      return; // Прерываем миграцию, если не удалось получить директорию
    }
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const medicine of medicines) {
      if (!medicine.photoUri || medicine.photoUri.trim() === '') {
        skippedCount++;
        continue;
      }

      const photoUri = medicine.photoUri.trim();

      // Пропускаем URL из интернета
      if (photoUri.startsWith('http://') || photoUri.startsWith('https://')) {
        skippedCount++;
        continue;
      }

      // Пропускаем уже мигрированные фотографии (в постоянной папке)
      if (photoUri.includes('medicine_photos/')) {
        skippedCount++;
        continue;
      }

      try {
        // Проверяем, существует ли файл (только если FileSystem доступен)
        if (FileSystem) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(photoUri);
            if (!fileInfo.exists) {
              console.log(`⚠️ Фотография не найдена: ${photoUri}`);
              skippedCount++;
              continue;
            }
          } catch (fileCheckError) {
            console.log(`⚠️ Ошибка проверки файла ${photoUri}:`, fileCheckError);
            skippedCount++;
            continue;
          }
        }

        // Копируем в постоянную папку
        const newUri = await saveMedicinePhoto(photoUri, medicine.id, medicine.userId);
        if (newUri) {
          console.log(`✅ Мигрирована фотография для лекарства ${medicine.id}: ${newUri}`);
          // Обновляем photoUri в базе данных
          try {
            const { getDB } = await import("../database/medicine.database");
            const db = await getDB();
            await db.runAsync(
              `UPDATE medicines SET photoUri = ? WHERE id = ?`,
              [newUri, medicine.id]
            );
            migratedCount++;
          } catch (updateError) {
            console.error(`Ошибка обновления photoUri для лекарства ${medicine.id}:`, updateError);
            errorCount++;
          }
        } else {
          errorCount++;
        }
      } catch (medicineError) {
        console.error(`Ошибка миграции фотографии для лекарства ${medicine.id}:`, medicineError);
        errorCount++;
      }
    }

    console.log(`✅ Миграция фотографий завершена: мигрировано ${migratedCount}, пропущено ${skippedCount}, ошибок ${errorCount}`);
  } catch (error) {
    console.error('Ошибка миграции фотографий:', error);
  }
}

// ----------------------------------------------------
// 🗑️ УДАЛИТЬ ФОТОГРАФИЮ ЛЕКАРСТВА
// ----------------------------------------------------
export async function deleteMedicinePhoto(photoUri: string): Promise<void> {
  try {
    if (!photoUri || photoUri.trim() === '') {
      return;
    }

    // Пропускаем URL из интернета
    if (photoUri.startsWith('http://') || photoUri.startsWith('https://')) {
      return;
    }

    // Пропускаем content:// URI (фото в галерее)
    if (photoUri.startsWith('content://')) {
      // Не удаляем из галереи, так как пользователь может хотеть сохранить фото
      return;
    }

    // Удаляем локальный файл (только если FileSystem доступен)
    if (FileSystem && (photoUri.startsWith('file://') || photoUri.startsWith('/'))) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(photoUri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(photoUri, { idempotent: true });
          console.log(`✅ Удалена фотография: ${photoUri}`);
        }
      } catch (deleteError) {
        console.error('Ошибка удаления фотографии:', deleteError);
      }
    }
  } catch (error) {
    console.error('Ошибка удаления фотографии:', error);
  }
}

