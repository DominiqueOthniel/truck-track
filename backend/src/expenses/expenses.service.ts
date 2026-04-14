import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Expense } from '../entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
  ) {}

  private normalizeOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private sanitizeDto<T extends Record<string, unknown>>(dto: T): T {
    return {
      ...dto,
      camionId: this.normalizeOptionalString(dto.camionId),
      tripId: this.normalizeOptionalString(dto.tripId),
      chauffeurId: this.normalizeOptionalString(dto.chauffeurId),
      fournisseurId: this.normalizeOptionalString(dto.fournisseurId),
      sousCategorie: this.normalizeOptionalString(dto.sousCategorie),
    } as T;
  }

  async create(dto: CreateExpenseDto): Promise<Expense> {
    const safeDto = this.sanitizeDto(dto as unknown as Record<string, unknown>);
    const expense = this.expenseRepository.create({
      id: uuidv4(),
      ...safeDto,
    });
    return this.expenseRepository.save(expense);
  }

  async findAll(): Promise<Expense[]> {
    return this.expenseRepository.find({
      relations: ['camion', 'fournisseur'],
      order: { date: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Expense> {
    const expense = await this.expenseRepository.findOne({
      where: { id },
      relations: ['camion', 'fournisseur'],
    });
    if (!expense) throw new NotFoundException(`Dépense ${id} introuvable`);
    return expense;
  }

  async update(id: string, dto: UpdateExpenseDto): Promise<Expense> {
    await this.findOne(id);
    const safeDto = this.sanitizeDto(dto as unknown as Record<string, unknown>);
    await this.expenseRepository.update(id, safeDto as Partial<Expense>);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.expenseRepository.delete(id);
  }
}
