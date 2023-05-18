import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserService } from './user.service';
import { CatService } from './cat.service';
import { PrismaService } from './prisma.service';
import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';
import * as winston from 'winston';


@Module({
  controllers: [AppController],
  providers: [AppService, UserService, CatService, PrismaService],
  imports: [
    WinstonModule.forRoot({
      level: 'debug',
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            nestWinstonModuleUtilities.format.nestLike('NewRelicExampleApp', {
              colors: true,
              prettyPrint: true,
            }),
          ),
        }),
      ]
    }),
  ]
})
export class AppModule {}
