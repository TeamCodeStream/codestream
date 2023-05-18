import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from './prisma.service';
import { NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';

async function bootstrap() {
  let app;
  
  if (process.env['NEST_USE_FASTIFY']) {
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule, 
      new FastifyAdapter(),
    );
    app.setViewEngine({
      engine: {
        handlebars: require('handlebars'),
      }
    });
  } else {
    app = await NestFactory.create(AppModule, {
      bufferLogs: true,
    });
  }
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app)
  await app.listen(3000);
}
bootstrap();
