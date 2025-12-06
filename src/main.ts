import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { checkExpiryDaily } from "./database/medicine.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: "*",
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type, Authorization",
  });

  // Проверяем expiry при старте
  await checkExpiryDaily();

  await app.listen(3000);
}
bootstrap();
