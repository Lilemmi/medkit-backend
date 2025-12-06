import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MedicinesModule } from './medicines/medicines.module';
import { PrismaService } from './prisma.service';

@Module({
  imports: [AuthModule, UsersModule, MedicinesModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
