import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Expense } from '../entities/expense.entity';
import { Trip } from '../entities/trip.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { AuditActor, AuditLogsService } from '../audit-logs/audit-logs.service';
import { CaisseService } from '../caisse/caisse.service';

@Injectable()
export class ExpensesService {
  /** Dépense auto liée au champ préfinancement du trajet (évite doublons / facture). */
  static readonly AUTO_PREFINANCEMENT_SOUS = '__auto_prefinancement_trajet__';

  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    private readonly auditLogsService: AuditLogsService,
    private readonly caisseService: CaisseService,
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

  async create(dto: CreateExpenseDto, actor?: AuditActor): Promise<Expense> {
    const safeDto = this.sanitizeDto(dto as unknown as Record<string, unknown>);
    const expense = this.expenseRepository.create({
      id: uuidv4(),
      ...safeDto,
    });
    const created = await this.expenseRepository.save(expense);
    await this.auditLogsService.log({
      module: 'expenses',
      action: 'CREATE',
      entityId: created.id,
      summary: `Création dépense ${created.categorie} (${Number(created.montant).toLocaleString('fr-FR')} FCFA)`,
      afterData: created as unknown as Record<string, unknown>,
      actor,
    });
    return created;
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

  async update(id: string, dto: UpdateExpenseDto, actor?: AuditActor): Promise<Expense> {
    const before = await this.findOne(id);
    const safeDto = this.sanitizeDto(dto as unknown as Record<string, unknown>);
    await this.expenseRepository.update(id, safeDto as Partial<Expense>);
    const after = await this.findOne(id);
    await this.auditLogsService.log({
      module: 'expenses',
      action: 'UPDATE',
      entityId: id,
      summary: `Modification dépense ${after.categorie}`,
      beforeData: before as unknown as Record<string, unknown>,
      afterData: after as unknown as Record<string, unknown>,
      actor,
    });
    return after;
  }

  async remove(id: string, actor?: AuditActor): Promise<void> {
    const before = await this.findOne(id);
    await this.expenseRepository.delete(id);
    await this.auditLogsService.log({
      module: 'expenses',
      action: 'DELETE',
      entityId: id,
      summary: `Suppression dépense ${before.categorie}`,
      beforeData: before as unknown as Record<string, unknown>,
      actor,
    });
  }

  private caisseRefForExpense(expenseId: string): string {
    return `depense:${expenseId}`;
  }

  private async upsertCaisseForExpense(expense: Expense, actor?: AuditActor): Promise<void> {
    const ref = this.caisseRefForExpense(expense.id);
    const dateStr = String(expense.date).split('T')[0];
    await this.caisseService.upsertByReference(
      ref,
      {
        type: 'sortie',
        montant: Number(expense.montant),
        date: dateStr,
        description: `Dépense — ${expense.description}`,
        reference: ref,
        categorie: expense.categorie,
      },
      actor,
    );
  }

  private async removeCaisseForExpenseId(expenseId: string): Promise<void> {
    await this.caisseService.removeByReference(this.caisseRefForExpense(expenseId));
  }

  /**
   * Crée / met à jour / supprime la dépense « préfinancement trajet » (sans facture).
   * La ligne caisse suit la référence `depense:<id>` comme pour les dépenses saisies à la main.
   */
  async syncTripPrefinancementExpense(
    trip: Trip,
    prefinancement: unknown,
    actor?: AuditActor,
  ): Promise<void> {
    const amount =
      prefinancement != null && prefinancement !== ''
        ? Number(prefinancement as string | number)
        : 0;
    const okAmount = Number.isFinite(amount) && amount > 0;

    const existing = await this.expenseRepository.findOne({
      where: { tripId: trip.id, sousCategorie: ExpensesService.AUTO_PREFINANCEMENT_SOUS },
    });

    if (!okAmount) {
      if (existing) {
        await this.removeCaisseForExpenseId(existing.id);
        await this.expenseRepository.delete(existing.id);
        await this.auditLogsService.log({
          module: 'expenses',
          action: 'DELETE',
          entityId: existing.id,
          summary: `Suppression dépense auto préfinancement (trajet ${trip.origine} → ${trip.destination})`,
          beforeData: existing as unknown as Record<string, unknown>,
          actor,
        });
      }
      return;
    }

    const camionId = trip.tracteurId ?? trip.remorqueuseId ?? undefined;
    const dateDepart = String(trip.dateDepart).split('T')[0];
    const description = `Préfinancement automatique — ${trip.origine} → ${trip.destination}`;

    if (existing) {
      const updated = await this.update(
        existing.id,
        {
          montant: amount,
          date: dateDepart,
          description,
          chauffeurId: trip.chauffeurId,
          camionId: camionId ?? undefined,
        } as UpdateExpenseDto,
        actor,
      );
      await this.upsertCaisseForExpense(updated, actor);
      return;
    }

    const created = await this.create(
      {
        tripId: trip.id,
        chauffeurId: trip.chauffeurId,
        camionId,
        categorie: 'Préfinancement',
        sousCategorie: ExpensesService.AUTO_PREFINANCEMENT_SOUS,
        montant: amount,
        date: dateDepart,
        description,
      } as CreateExpenseDto,
      actor,
    );
    await this.upsertCaisseForExpense(created, actor);
  }
}
