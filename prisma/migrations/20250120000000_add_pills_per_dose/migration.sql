-- Добавляем поле pillsPerDose в таблицу Medicine
ALTER TABLE "Medicine" ADD COLUMN IF NOT EXISTS "pillsPerDose" INTEGER;

