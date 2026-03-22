import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CaisseService } from './caisse.service';
import { CreateCaisseTransactionDto } from './dto/create-caisse-transaction.dto';
import { UpdateCaisseTransactionDto } from './dto/update-caisse-transaction.dto';
import { UpdateCaisseConfigDto } from './dto/update-caisse-config.dto';

@Controller('caisse')
export class CaisseController {
  constructor(private readonly caisseService: CaisseService) {}

  @Get('config')
  getConfig() {
    return this.caisseService.getConfig();
  }

  @Patch('config')
  updateConfig(@Body() dto: UpdateCaisseConfigDto) {
    return this.caisseService.updateConfig(dto);
  }

  @Get('balance')
  getBalance() {
    return this.caisseService.getBalance();
  }

  /** Chemins littéraux avant `transactions/:id` pour éviter qu’un segment soit pris pour un paramètre. */
  @Get('transactions')
  findAllTransactions() {
    return this.caisseService.findAllTransactions();
  }

  @Post('transactions/upsert-by-reference')
  upsertByReference(
    @Query('reference') reference: string,
    @Body() dto: CreateCaisseTransactionDto,
  ) {
    if (!reference) {
      return this.caisseService.create(dto);
    }
    return this.caisseService.upsertByReference(reference, { ...dto, reference });
  }

  @Delete('transactions/by-reference')
  @HttpCode(204)
  async removeByReference(@Query('reference') reference: string): Promise<void> {
    if (reference) await this.caisseService.removeByReference(reference);
  }

  @Post('transactions')
  createTransaction(@Body() dto: CreateCaisseTransactionDto) {
    return this.caisseService.create(dto);
  }

  @Patch('transactions/:id')
  updateTransaction(
    @Param('id') id: string,
    @Body() dto: UpdateCaisseTransactionDto,
  ) {
    return this.caisseService.update(id, dto);
  }

  @Delete('transactions/:id')
  @HttpCode(204)
  async removeTransaction(@Param('id') id: string): Promise<void> {
    await this.caisseService.remove(id);
  }
}
