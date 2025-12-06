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
    const medicine = await this.prisma.medicine.create({
      data: {
        ...dto,
        userId,
      },
    });

    // Записываем в историю
    await this.prisma.inventoryHistory.create({
      data: {
        userId,
        medicineId: medicine.id,
        action: 'created',
        newData: medicine,
        description: `Лекарство "${medicine.name || 'Без названия'}" добавлено в инвентарь`,
      },
    });

    return medicine;
  }

  async delete(userId: number, id: number) {
    // Получаем данные перед удалением
    const medicine = await this.prisma.medicine.findFirst({
      where: { id, userId },
    });

    if (!medicine) {
      throw new NotFoundException('Medicine not found');
    }

    await this.prisma.medicine.delete({
      where: { id, userId },
    });

    // Записываем в историю
    await this.prisma.inventoryHistory.create({
      data: {
        userId,
        medicineId: id,
        action: 'deleted',
        oldData: medicine,
        description: `Лекарство "${medicine.name || 'Без названия'}" удалено из инвентаря`,
      },
    });

    return medicine;
  }

  async update(userId: number, id: number, dto) {
    // Получаем старые данные
    const oldMedicine = await this.prisma.medicine.findFirst({
      where: { id, userId },
    });

    if (!oldMedicine) {
      throw new NotFoundException('Medicine not found');
    }

    const updatedMedicine = await this.prisma.medicine.update({
      where: { id, userId },
      data: dto,
    });

    // Записываем в историю
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

    return updatedMedicine;
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
