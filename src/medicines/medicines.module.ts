import { Module } from '@nestjs/common';
import { MedicinesController } from './medicines.controller';
import { MedicinesService } from './medicines.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [MedicinesController],
  providers: [MedicinesService, PrismaService],
  exports: [MedicinesService],
})
export class MedicinesModule {}



