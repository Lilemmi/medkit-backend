# Обновление базы данных - Расширенные поля лекарств

## Описание изменений

Схема базы данных была обновлена для поддержки всех полей лекарств, которые используются в мобильном приложении.

## Новые поля в таблице Medicine

### Параметры приема лекарства
- `takeWithFood` - до еды, после еды, во время еды, независимо
- `takeWithLiquid` - чем запивать (вода, молоко и т.д.)
- `incompatibleMedicines` (JSONB) - массив названий несовместимых препаратов
- `compatibleMedicines` (JSONB) - массив с информацией о совместимых препаратах
- `forbiddenFoods` (JSONB) - массив запрещенных продуктов
- `recommendedFoods` (JSONB) - массив рекомендуемых продуктов
- `alcoholInteraction` - взаимодействие с алкоголем
- `caffeineInteraction` - взаимодействие с кофе/чаем
- `storageConditions` - условия хранения
- `specialInstructions` - особые указания
- `sideEffects` - побочные эффекты
- `contraindications` - противопоказания

### Количество и учет
- `quantity` - количество упаковок
- `totalPills` - общее количество таблеток в упаковке
- `usedPills` - использовано таблеток
- `lowStockThreshold` - порог для уведомления о низком количестве
- `familyMemberId` - ID члена семьи, для кого предназначено лекарство
- `userDosage` - дозировка для конкретного пользователя/члена семьи

### Расширенная информация о лекарстве
- `internationalName` - Международное непатентованное название (МНН)
- `manufacturer` - Производитель
- `packageVolume` - Объём / количество в упаковке
- `category` - Категория лекарства
- `activeIngredients` (JSONB) - массив активных веществ
- `indications` (JSONB) - показания к применению
- `contraindicationsDetailed` (JSONB) - детальные противопоказания
- `warnings` (JSONB) - предупреждения и риски
- `foodCompatibility` (JSONB) - совместимость с едой
- `drugCompatibility` (JSONB) - совместимость с другими препаратами
- `dosageDetailed` (JSONB) - детальная дозировка
- `childrenRestrictions` (JSONB) - ограничения для детей
- `sideEffectsDetailed` (JSONB) - детальные побочные эффекты
- `storageConditionsDetailed` (JSONB) - детальные условия хранения
- `additionalRecommendations` (JSONB) - дополнительные рекомендации

## Применение миграции

### Локально (для разработки)

```bash
cd medkit-backend
npx prisma migrate dev
npx prisma generate
```

### На Railway (автоматически)

Миграция будет применена автоматически при деплое, так как в `railway.json` указана команда:
```json
"startCommand": "npx prisma generate && npx prisma migrate deploy && npm run build && npm run start:prod"
```

### Вручную на Railway

Если нужно применить миграцию вручную:

```bash
# Убедитесь, что DATABASE_URL указывает на Railway PostgreSQL
npx prisma migrate deploy
```

## Важные замечания

1. **Все новые поля опциональны** - существующие записи не будут затронуты
2. **JSONB поля** - используются для хранения массивов и объектов
3. **Обратная совместимость** - старые записи продолжат работать
4. **Синхронизация** - мобильное приложение теперь может синхронизировать все поля с сервером

## Проверка

После применения миграции проверьте:

```bash
# Проверить схему
npx prisma validate

# Открыть Prisma Studio для просмотра данных
npx prisma studio
```



