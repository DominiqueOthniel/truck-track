import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreditsService } from './credits.service';
import { CreateCreditDto } from './dto/create-credit.dto';
import { UpdateCreditDto } from './dto/update-credit.dto';
import { CreateRemboursementDto } from './dto/create-remboursement.dto';

@Controller('credits')
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get()
  findAll() {
    return this.creditsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.creditsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCreditDto) {
    return this.creditsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCreditDto) {
    return this.creditsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.creditsService.remove(id);
  }

  @Post(':id/remboursements')
  addRemboursement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRemboursementDto,
  ) {
    return this.creditsService.addRemboursement(id, dto);
  }
}
