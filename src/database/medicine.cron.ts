import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { checkExpiryDaily } from "./medicine.service";

@Injectable()
export class MedicineCron {
  
  @Cron("0 9 * * *")  // Каждый день в 09:00
  async dailyCheck() {
    console.log("⏰ Daily expiry check started");
    await checkExpiryDaily();
  }
}
