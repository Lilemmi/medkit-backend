import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { MedicinesService } from "./medicines.service";
import { User } from "../auth/decorators/user.decorator";

@Controller("medicines")
// JwtAuthGuard применяется глобально, не нужно указывать здесь
export class MedicinesController {
  constructor(private service: MedicinesService) {}

  @Get()
  getAll(@User() user: any) {
    // userId берется из токена, а не из URL параметров
    return this.service.getAll(user.id);
  }

  @Post()
  create(@User() user: any, @Body() dto) {
    // userId берется из токена
    return this.service.create(user.id, dto);
  }

  @Put(":id")
  update(
    @User() user: any,
    @Param("id") id: string,
    @Body() dto
  ) {
    // userId берется из токена, проверка прав доступа выполняется в сервисе
    return this.service.update(user.id, Number(id), dto);
  }

  @Delete(":id")
  async delete(@User() user: any, @Param("id") id: string) {
    // userId берется из токена, проверка прав доступа выполняется в сервисе
    try {
      return await this.service.delete(user.id, Number(id));
    } catch (error) {
      console.error('❌ Ошибка в контроллере при удалении лекарства:', error);
      throw error;
    }
  }

  @Get("expired")
  getExpired(@User() user: any) {
    return this.service.expired(user.id);
  }

  @Get("soon")
  getExpiringSoon(@User() user: any) {
    return this.service.expiringSoon(user.id);
  }

  @Get("history")
  getInventoryHistory(@User() user: any) {
    return this.service.getInventoryHistory(user.id);
  }

  @Get("history/:medicineId")
  getMedicineHistory(
    @User() user: any,
    @Param("medicineId") medicineId: string
  ) {
    return this.service.getMedicineHistory(user.id, Number(medicineId));
  }
}
