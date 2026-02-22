import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { BankAccount } from '../entities/bank-account.entity';
import { BankTransaction } from '../entities/bank-transaction.entity';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { CreateBankTransactionDto } from './dto/create-bank-transaction.dto';
import { UpdateBankTransactionDto } from './dto/update-bank-transaction.dto';

@Injectable()
export class BankService {
  constructor(
    @InjectRepository(BankAccount)
    private readonly accountRepository: Repository<BankAccount>,
    @InjectRepository(BankTransaction)
    private readonly transactionRepository: Repository<BankTransaction>,
  ) {}

  // --- Comptes ---
  async createAccount(dto: CreateBankAccountDto): Promise<BankAccount> {
    const account = this.accountRepository.create({
      id: uuidv4(),
      ...dto,
      soldeActuel: dto.soldeInitial,
      devise: dto.devise || 'FCFA',
    });
    return this.accountRepository.save(account);
  }

  async findAllAccounts(): Promise<BankAccount[]> {
    return this.accountRepository.find({
      relations: ['transactions'],
      order: { nom: 'ASC' },
    });
  }

  async findOneAccount(id: string): Promise<BankAccount> {
    const account = await this.accountRepository.findOne({
      where: { id },
      relations: ['transactions'],
    });
    if (!account) throw new NotFoundException(`Compte ${id} introuvable`);
    return account;
  }

  async updateAccount(id: string, dto: UpdateBankAccountDto): Promise<BankAccount> {
    await this.findOneAccount(id);
    await this.accountRepository.update(id, dto as Partial<BankAccount>);
    return this.findOneAccount(id);
  }

  async removeAccount(id: string): Promise<void> {
    await this.findOneAccount(id);
    await this.accountRepository.delete(id);
  }

  // --- Transactions ---
  async createTransaction(dto: CreateBankTransactionDto): Promise<BankTransaction> {
    const account = await this.findOneAccount(dto.compteId);
    const transaction = this.transactionRepository.create({
      id: uuidv4(),
      ...dto,
    });
    const saved = await this.transactionRepository.save(transaction);

    // Mise à jour du solde
    const delta =
      dto.type === 'depot' ? Number(dto.montant) : -Number(dto.montant);
    const newSolde = Number(account.soldeActuel) + delta;
    await this.accountRepository.update(dto.compteId, {
      soldeActuel: newSolde,
    } as Partial<BankAccount>);

    return saved;
  }

  async findAllTransactions(): Promise<BankTransaction[]> {
    return this.transactionRepository.find({
      relations: ['compte'],
      order: { date: 'DESC' },
    });
  }

  async findTransactionsByAccount(compteId: string): Promise<BankTransaction[]> {
    return this.transactionRepository.find({
      where: { compteId },
      relations: ['compte'],
      order: { date: 'DESC' },
    });
  }

  async findOneTransaction(id: string): Promise<BankTransaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: ['compte'],
    });
    if (!transaction)
      throw new NotFoundException(`Transaction ${id} introuvable`);
    return transaction;
  }

  async updateTransaction(
    id: string,
    dto: UpdateBankTransactionDto,
  ): Promise<BankTransaction> {
    await this.findOneTransaction(id);
    await this.transactionRepository.update(id, dto as Partial<BankTransaction>);
    return this.findOneTransaction(id);
  }

  async removeTransaction(id: string): Promise<void> {
    await this.findOneTransaction(id);
    await this.transactionRepository.delete(id);
  }
}
