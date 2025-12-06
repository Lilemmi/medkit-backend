import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { MedicinesService } from "./medicines.service";

@Controller("medicines")
export class MedicinesController {
  constructor(private service: MedicinesService) {}

  @Get(":userId")
  getAll(@Param("userId") userId: string) {
    return this.service.getAll(Number(userId));
  }

  @Post(":userId")
  create(@Param("userId") userId: string, @Body() dto) {
    return this.service.create(Number(userId), dto);
  }

  @Put(":userId/:id")
  update(
    @Param("userId") userId: string,
    @Param("id") id: string,
    @Body() dto
  ) {
    return this.service.update(Number(userId), Number(id), dto);
  }

  @Delete(":userId/:id")
  delete(@Param("userId") userId: string, @Param("id") id: string) {
    return this.service.delete(Number(userId), Number(id));
  }

  @Get(":userId/expired")
  getExpired(@Param("userId") userId: string) {
    return this.service.expired(Number(userId));
  }

  @Get(":userId/soon")
  getExpiringSoon(@Param("userId") userId: string) {
    return this.service.expiringSoon(Number(userId));
  }

  @Get(":userId/history")
  getInventoryHistory(@Param("userId") userId: string) {
    return this.service.getInventoryHistory(Number(userId));
  }

  @Get(":userId/history/:medicineId")
  getMedicineHistory(
    @Param("userId") userId: string,
    @Param("medicineId") medicineId: string
  ) {
    return this.service.getMedicineHistory(Number(userId), Number(medicineId));
  }
}
