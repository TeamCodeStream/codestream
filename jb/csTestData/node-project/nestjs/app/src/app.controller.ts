import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Put,
  Delete,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CatService } from './cat.service';
import { LoggingInterceptor } from './logging.interceptors';
import { PolitenessGuard } from './polite.guards'
import { User as UserModel, Cat as CatModel } from '@prisma/client';

@UseGuards(PolitenessGuard)
@UseInterceptors(LoggingInterceptor)
@Controller()
export class AppController {
  constructor(
    private readonly userService: UserService,
    private readonly catService: CatService,
  ) {}

  @Get()
  getHello(): string {
    return 'Hello World!';
  }

  @Get('user/:id')
  async getUserById(@Param('id') id: string): Promise<UserModel> {
    return this.userService.user({ id: Number(id) });
  }

  @Get('cat/:id')
  async getCatById(@Param('id') id: string): Promise<CatModel> {
    return this.catService.cat({ id: Number(id) });
  }

  @Get('filtered-cats/:searchString')
  async getFilteredCats(
    @Param('searchString') searchString: string,
  ): Promise<CatModel[]> {
    return this.catService.cats({
      where: {
        OR: [
          {
            name: { contains: searchString },
          },
          {
            breed: { contains: searchString },
          },
        ],
      },
    });
  }

  @Post('cat')
  async createCat(
    @Body() catData: { name: string; breed: string; ownerEmail: string, birthdate: string },
  ): Promise<CatModel> {
    const { name, breed, ownerEmail, birthdate } = catData;
    return this.catService.createCat({
      name,
      breed,
      owner: {
        connect: { email: ownerEmail },
      },
      birthdate: new Date(birthdate),
    });
  }

  @Post('user')
  async signupUser(
    @Body() userData: { name: string; email: string },
  ): Promise<UserModel> {
    return this.userService.createUser(userData);
  }

  @Delete('cat/:id')
  async deleteCat(@Param('id') id: string): Promise<CatModel> {
    return this.catService.deleteCat({ id: Number(id) });
  }

  @Delete('user/:id')
  async deleteUser(@Param('id') id: string): Promise<UserModel> {
    return this.userService.deleteUser({ id: Number(id) });
  }
}
