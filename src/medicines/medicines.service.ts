import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class MedicinesService {
  constructor(private prisma: PrismaService) {}

  async getAll(userId: number) {
    return this.prisma.medicine.findMany({
      where: { userId },
      orderBy: { id: "desc" },
    });
  }

  async create(userId: number, dto) {
    try {
      // Логируем входящие данные для отладки
      console.log('📥 CREATE MEDICINE REQUEST:', {
        userId,
        dto: {
          ...dto,
          expiry: dto.expiry ? `${dto.expiry} (type: ${typeof dto.expiry})` : null,
        },
      });

      // Преобразуем expiry в Date объект, если это строка
      const data: any = { ...dto, userId };
      if (data.expiry && typeof data.expiry === 'string') {
        try {
          const expiryDate = new Date(data.expiry);
          if (!isNaN(expiryDate.getTime())) {
            data.expiry = expiryDate;
          } else {
            console.warn('⚠️ Невалидная дата expiry:', data.expiry);
            data.expiry = null;
          }
        } catch (error) {
          console.error('❌ Ошибка преобразования даты:', error);
          data.expiry = null;
        }
      }

      // Удаляем serverId из данных, так как это поле генерируется сервером
      delete data.serverId;
      delete data.syncedAt;

      const medicine = await this.prisma.medicine.create({
        data,
      });

      // Записываем в историю
      try {
        await this.prisma.inventoryHistory.create({
          data: {
            userId,
            medicineId: medicine.id,
            action: 'created',
            newData: medicine,
            description: `Лекарство "${medicine.name || 'Без названия'}" добавлено в инвентарь`,
          },
        });
      } catch (historyError) {
        // Логируем ошибку истории, но не прерываем создание лекарства
        console.error('❌ Ошибка создания истории для лекарства:', historyError);
      }

      return medicine;
    } catch (error) {
      console.error('❌ Ошибка создания лекарства:', error);
      console.error('❌ Детали ошибки:', {
        message: error?.message,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack,
      });
      throw error;
    }
  }

  async delete(userId: number, id: number) {
    try {
      // Получаем данные перед удалением
      const medicine = await this.prisma.medicine.findFirst({
        where: { id, userId },
      });

      if (!medicine) {
        throw new NotFoundException('Medicine not found');
      }

      // Записываем в историю ПЕРЕД удалением, чтобы medicineId был валидным
      try {
        await this.prisma.inventoryHistory.create({
          data: {
            userId,
            medicineId: id,
            action: 'deleted',
            oldData: medicine,
            description: `Лекарство "${medicine.name || 'Без названия'}" удалено из инвентаря`,
          },
        });
      } catch (historyError) {
        // Логируем ошибку истории, но не прерываем удаление лекарства
        console.error('❌ Ошибка создания истории при удалении лекарства:', historyError);
        console.error('❌ Детали ошибки истории:', {
          message: historyError?.message,
          code: historyError?.code,
          meta: historyError?.meta,
        });
      }

      // Удаляем лекарство
      await this.prisma.medicine.delete({
        where: { id, userId },
      });

      return medicine;
    } catch (error) {
      console.error('❌ Ошибка удаления лекарства:', error);
      console.error('❌ Детали ошибки:', {
        userId,
        medicineId: id,
        message: error?.message,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack,
      });
      throw error;
    }
  }

  async update(userId: number, id: number, dto) {
    try {
      // Получаем старые данные
      const oldMedicine = await this.prisma.medicine.findFirst({
        where: { id, userId },
      });

      if (!oldMedicine) {
        throw new NotFoundException('Medicine not found');
      }

      // Преобразуем expiry в Date объект, если это строка
      const updateData: any = { ...dto };
      if (updateData.expiry && typeof updateData.expiry === 'string') {
        try {
          const expiryDate = new Date(updateData.expiry);
          if (!isNaN(expiryDate.getTime())) {
            updateData.expiry = expiryDate;
          } else {
            console.warn('⚠️ Невалидная дата expiry:', updateData.expiry);
            updateData.expiry = null;
          }
        } catch (error) {
          console.error('❌ Ошибка преобразования даты:', error);
          updateData.expiry = null;
        }
      }

      // Удаляем serverId и syncedAt из данных обновления
      delete updateData.serverId;
      delete updateData.syncedAt;
      delete updateData.id;
      delete updateData.userId;
      delete updateData.createdAt;

      const updatedMedicine = await this.prisma.medicine.update({
        where: { id, userId },
        data: updateData,
      });

      // Записываем в историю
      try {
        await this.prisma.inventoryHistory.create({
          data: {
            userId,
            medicineId: id,
            action: 'updated',
            oldData: oldMedicine,
            newData: updatedMedicine,
            description: `Лекарство "${updatedMedicine.name || 'Без названия'}" обновлено`,
          },
        });
      } catch (historyError) {
        // Логируем ошибку истории, но не прерываем обновление лекарства
        console.error('❌ Ошибка создания истории при обновлении лекарства:', historyError);
        console.error('❌ Детали ошибки истории:', {
          message: historyError?.message,
          code: historyError?.code,
          meta: historyError?.meta,
        });
      }

      return updatedMedicine;
    } catch (error) {
      console.error('❌ Ошибка обновления лекарства:', error);
      console.error('❌ Детали ошибки:', {
        userId,
        medicineId: id,
        message: error?.message,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack,
      });
      throw error;
    }
  }

  async expired(userId: number) {
    const today = new Date();

    return this.prisma.medicine.findMany({
      where: {
        userId,
        expiry: { lt: today },
      },
    });
  }

  async expiringSoon(userId: number) {
    const today = new Date();
    const limit = new Date();
    limit.setDate(limit.getDate() + 7);

    return this.prisma.medicine.findMany({
      where: {
        userId,
        expiry: {
          gte: today,
          lte: limit,
        },
      },
    });
  }

  // Получить историю инвентаризации для пользователя
  async getInventoryHistory(userId: number, limit: number = 50) {
    return this.prisma.inventoryHistory.findMany({
      where: { userId },
      include: {
        medicine: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // Получить историю конкретного лекарства
  async getMedicineHistory(userId: number, medicineId: number) {
    return this.prisma.inventoryHistory.findMany({
      where: {
        userId,
        medicineId,
      },
      include: {
        medicine: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
