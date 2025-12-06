import { Injectable } from "@nestjs/common";
import axios from "axios";

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaClient) {}

  async saveToken(userId: number, token: string) {
    return this.prisma.notificationToken.upsert({
      where: { token },
      update: {},
      create: { userId, token },
    });
  }

  async sendPush(token: string, title: string, body: string) {
    await axios.post("https://exp.host/--/api/v2/push/send", {
      to: token,
      title,
      body,
      sound: "default",
      priority: "high",
    });
  }

  async sendToUser(userId: number, title: string, body: string) {
    const tokens = await this.prisma.notificationToken.findMany({
      where: { userId },
    });

    for (const t of tokens) {
      await this.sendPush(t.token, title, body);
    }
  }
}
