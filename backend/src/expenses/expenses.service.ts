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

  async create(dto: CreateExpenseDto): Promise<Expense> {
    const expense = this.expenseRepository.create({
      id: uuidv4(),
      ...dto,
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
    await this.expenseRepository.update(id, dto as Partial<Expense>);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.expenseRepository.delete(id);
  }
}
