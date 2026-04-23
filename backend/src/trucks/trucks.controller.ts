import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  HttpCode,
} from '@nestjs/common';
import { TrucksService } from './trucks.service';
import { CreateTruckDto } from './dto/create-truck.dto';
import { CreateTruckCoupleDto } from './dto/create-truck-couple.dto';
import { UpdateTruckDto } from './dto/update-truck.dto';

@Controller('trucks')
export class TrucksController {
  constructor(private readonly trucksService: TrucksService) {}

  /** Création tracteur + remorque jumelés en une transaction (préféré au 4 appels séparés). */
  @Post('couple')
  createCouple(@Body() dto: CreateTruckCoupleDto) {
    return this.trucksService.createCoupledPair(dto);
  }

  @Post()
  create(@Body() createTruckDto: CreateTruckDto) {
    return this.trucksService.create(createTruckDto);
  }

  @Get()
  findAll() {
    return this.trucksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.trucksService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTruckDto: UpdateTruckDto,
  ) {
    return this.trucksService.update(id, updateTruckDto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.trucksService.remove(id);
  }
}
