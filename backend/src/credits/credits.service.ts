import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Credit } from '../entities/credit.entity';
import { CreditRemboursement } from '../entities/credit-remboursement.entity';
import { CreateCreditDto } from './dto/create-credit.dto';
import { UpdateCreditDto } from './dto/update-credit.dto';
import { CreateRemboursementDto } from './dto/create-remboursement.dto';

@Injectable()
export class CreditsService {
  constructor(
    @InjectRepository(Credit)
    private readonly creditRepo: Repository<Credit>,
    @InjectRepository(CreditRemboursement)
    private readonly rembRepo: Repository<CreditRemboursement>,
  ) {}

  async findAll(): Promise<Credit[]> {
    return this.creditRepo.find({
      relations: ['remboursements'],
      order: { dateDebut: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Credit> {
    const c = await this.creditRepo.findOne({
      where: { id },
      relations: ['remboursements'],
    });
    if (!c) throw new NotFoundException(`Crédit ${id} introuvable`);
    return c;
  }

  async create(dto: CreateCreditDto): Promise<Credit> {
    const c = this.creditRepo.create({
      id: uuidv4(),
      type: dto.type,
      intitule: dto.intitule,
      preteur: dto.preteur,
      montantTotal: String(dto.montantTotal),
      montantRembourse: '0',
      tauxInteret: dto.tauxInteret != null ? String(dto.tauxInteret) : undefined,
      dateDebut: dto.dateDebut.split('T')[0],
      dateEcheance: dto.dateEcheance?.split('T')[0],
      statut: 'en_cours',
      notes: dto.notes,
      remboursements: [],
    });
    return this.creditRepo.save(c);
  }

  async update(id: string, dto: UpdateCreditDto): Promise<Credit> {
    await this.findOne(id);
    const patch: Partial<Credit> = {};
    if (dto.type !== undefined) patch.type = dto.type;
    if (dto.intitule !== undefined) patch.intitule = dto.intitule;
    if (dto.preteur !== undefined) patch.preteur = dto.preteur;
    if (dto.montantTotal !== undefined) patch.montantTotal = String(dto.montantTotal);
    if (dto.montantRembourse !== undefined)
      patch.montantRembourse = String(dto.montantRembourse);
    if (dto.tauxInteret !== undefined)
      patch.tauxInteret = dto.tauxInteret != null ? String(dto.tauxInteret) : undefined;
    if (dto.dateDebut !== undefined) patch.dateDebut = dto.dateDebut.split('T')[0];
    if (dto.dateEcheance !== undefined)
      patch.dateEcheance = dto.dateEcheance?.split('T')[0];
    if (dto.statut !== undefined) patch.statut = dto.statut;
    if (dto.notes !== undefined) patch.notes = dto.notes;
    await this.creditRepo.update(id, patch);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const r = await this.creditRepo.delete(id);
    if (!r.affected) throw new NotFoundException(`Crédit ${id} introuvable`);
  }

  async addRemboursement(
    creditId: string,
    dto: CreateRemboursementDto,
  ): Promise<Credit> {
    const credit = await this.findOne(creditId);
    const remb = this.rembRepo.create({
      id: uuidv4(),
      creditId,
      date: dto.date.split('T')[0],
      montant: String(dto.montant),
      note: dto.note,
    });
    await this.rembRepo.save(remb);
    const totalRemb =
      Number(credit.montantRembourse) + dto.montant;
    let statut = credit.statut;
    if (totalRemb >= Number(credit.montantTotal)) statut = 'solde';
    else if (credit.statut === 'solde' && totalRemb < Number(credit.montantTotal))
      statut = 'en_cours';
    await this.creditRepo.update(creditId, {
      montantRembourse: String(totalRemb),
      statut,
    });
    return this.findOne(creditId);
  }
}
