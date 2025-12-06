import { Module } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { NotificationService } from "./notifications.service";

@Module({
  providers: [NotificationService, PrismaClient],
  exports: [NotificationService],
})
export class NotificationsModule {}
