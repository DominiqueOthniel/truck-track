import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CaisseConfig } from '../entities/caisse-config.entity';
import { CaisseTransactionEntity } from '../entities/caisse-transaction.entity';
import { CreateCaisseTransactionDto } from './dto/create-caisse-transaction.dto';
import { UpdateCaisseTransactionDto } from './dto/update-caisse-transaction.dto';
import { UpdateCaisseConfigDto } from './dto/update-caisse-config.dto';

@Injectable()
export class CaisseService {
  constructor(
    @InjectRepository(CaisseConfig)
    private readonly configRepo: Repository<CaisseConfig>,
    @InjectRepository(CaisseTransactionEntity)
    private readonly txRepo: Repository<CaisseTransactionEntity>,
  ) {}

  private async getOrCreateConfig(): Promise<CaisseConfig> {
    let row = await this.configRepo.findOne({ where: { id: 1 } });
    if (!row) {
      row = this.configRepo.create({ id: 1, soldeInitial: '0' });
      await this.configRepo.save(row);
    }
    return row;
  }

  async getConfig(): Promise<{ id: number; soldeInitial: number }> {
    const c = await this.getOrCreateConfig();
    return { id: c.id, soldeInitial: Number(c.soldeInitial) };
  }

  async updateConfig(dto: UpdateCaisseConfigDto): Promise<{ id: number; soldeInitial: number }> {
    await this.getOrCreateConfig();
    await this.configRepo.update(1, {
      soldeInitial: String(dto.soldeInitial),
      updatedAt: new Date(),
    });
    const c = await this.getOrCreateConfig();
    return { id: c.id, soldeInitial: Number(c.soldeInitial) };
  }

  async findAllTransactions(): Promise<CaisseTransactionEntity[]> {
    return this.txRepo.find({ order: { date: 'DESC', createdAt: 'DESC' } });
  }

  async getBalance(): Promise<{ soldeInitial: number; soldeActuel: number }> {
    const config = await this.getOrCreateConfig();
    const txs = await this.txRepo.find();
    let solde = Number(config.soldeInitial);
    for (const t of txs) {
      const m = Number(t.montant);
      solde += t.type === 'entree' ? m : -m;
    }
    return { soldeInitial: Number(config.soldeInitial), soldeActuel: solde };
  }

  async create(dto: CreateCaisseTransactionDto): Promise<CaisseTransactionEntity> {
    const id = dto.id?.trim() || uuidv4();
    const row = this.txRepo.create({
      id,
      type: dto.type,
      montant: String(dto.montant),
      date: dto.date.split('T')[0],
      description: dto.description,
      categorie: dto.categorie,
      reference: dto.reference,
      compteBanqueId: dto.compteBanqueId,
      bankTransactionId: dto.bankTransactionId,
      exclutRevenu: dto.exclutRevenu ?? false,
      createdAt: new Date(),
    });
    return this.txRepo.save(row);
  }

  async update(id: string, dto: UpdateCaisseTransactionDto): Promise<CaisseTransactionEntity> {
    const existing = await this.txRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException(`Mouvement caisse ${id} introuvable`);
    const patch: Partial<CaisseTransactionEntity> = {};
    if (dto.type !== undefined) patch.type = dto.type;
    if (dto.montant !== undefined) patch.montant = String(dto.montant);
    if (dto.date !== undefined) patch.date = dto.date.split('T')[0];
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.categorie !== undefined) patch.categorie = dto.categorie;
    if (dto.reference !== undefined) patch.reference = dto.reference;
    if (dto.compteBanqueId !== undefined) patch.compteBanqueId = dto.compteBanqueId;
    if (dto.bankTransactionId !== undefined) patch.bankTransactionId = dto.bankTransactionId;
    if (dto.exclutRevenu !== undefined) patch.exclutRevenu = dto.exclutRevenu;
    await this.txRepo.update(id, patch);
    const u = await this.txRepo.findOne({ where: { id } });
    if (!u) throw new NotFoundException(`Mouvement caisse ${id} introuvable`);
    return u;
  }

  async remove(id: string): Promise<void> {
    const r = await this.txRepo.delete(id);
    if (!r.affected) throw new NotFoundException(`Mouvement caisse ${id} introuvable`);
  }

  /** Remplace la ligne si même reference (ex. depense:<uuid>). */
  async upsertByReference(
    reference: string,
    dto: CreateCaisseTransactionDto,
  ): Promise<CaisseTransactionEntity> {
    const existing = await this.txRepo.findOne({ where: { reference } });
    if (existing) {
      await this.update(existing.id, {
        type: dto.type,
        montant: dto.montant,
        date: dto.date,
        description: dto.description,
        categorie: dto.categorie,
        reference: dto.reference,
        compteBanqueId: dto.compteBanqueId,
        bankTransactionId: dto.bankTransactionId,
        exclutRevenu: dto.exclutRevenu,
      });
      const u = await this.txRepo.findOne({ where: { id: existing.id } });
      return u!;
    }
    return this.create({ ...dto, reference });
  }

  async removeByReference(reference: string): Promise<void> {
    await this.txRepo.delete({ reference });
  }
}
