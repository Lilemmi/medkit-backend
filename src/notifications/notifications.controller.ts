import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RegisterTokenDto } from "./dto/register-token.dto";
import { NotificationService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly service: NotificationService) {}

  // 🟢 ДЕКОРАТОР GUARD ВСЕГДА СТАВИТСЯ ПЕРВЫМ!
  @UseGuards(JwtAuthGuard)
  @Post("register")
  async register(
    @Body() body: RegisterTokenDto,
    @Req() req: any
  ) {
    const userId = req.user?.id;
    return this.service.saveToken(userId, body.token);
  }
}
