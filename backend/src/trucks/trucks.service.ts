import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Truck } from '../entities/truck.entity';
import { CreateTruckDto } from './dto/create-truck.dto';
import { CreateTruckCoupleDto } from './dto/create-truck-couple.dto';
import { UpdateTruckDto } from './dto/update-truck.dto';
import { uploadImageFromDataUrl } from '../utils/supabase-upload';

@Injectable()
export class TrucksService {
  constructor(
    @InjectRepository(Truck)
    private readonly truckRepository: Repository<Truck>,
  ) {}

  async create(dto: CreateTruckDto): Promise<Truck> {
    const id = uuidv4();
    return this.persistNewTruck(this.truckRepository.manager, id, dto);
  }

  /**
   * Crée tracteur + remorque et jumelage en une seule transaction (évite 500 partiels / orphelins).
   */
  async createCoupledPair(dto: CreateTruckCoupleDto): Promise<{ tracteur: Truck; remorque: Truck }> {
    try {
      return await this.truckRepository.manager.transaction(async (em) => {
        const tid = uuidv4();
        const rid = uuidv4();
        const base: Omit<CreateTruckDto, 'immatriculation' | 'type' | 'chauffeurId'> = {
          modele: dto.modele,
          statut: dto.statut,
          dateMiseEnCirculation: dto.dateMiseEnCirculation,
          photo: dto.photo,
          proprietaireId: dto.proprietaireId,
        };
        const tracteurDto: CreateTruckDto = {
          ...base,
          immatriculation: dto.tracteurImmatriculation,
          type: 'tracteur',
          chauffeurId: dto.chauffeurId,
        };
        const remorqueDto: CreateTruckDto = {
          ...base,
          immatriculation: dto.remorqueImmatriculation,
          type: 'remorqueuse',
        };
        const t = await this.persistNewTruck(em, tid, tracteurDto);
        const r = await this.persistNewTruck(em, rid, remorqueDto);
        await this.applyPairingTx(em, t.id, r.id);
        const repo = em.getRepository(Truck);
        const tracteur = await repo.findOne({
          where: { id: t.id },
          relations: ['proprietaire', 'chauffeur'],
        });
        const remorque = await repo.findOne({
          where: { id: r.id },
          relations: ['proprietaire', 'chauffeur'],
        });
        if (!tracteur || !remorque) {
          throw new InternalServerErrorException('Lecture des camions créés impossible.');
        }
        return { tracteur, remorque };
      });
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException) {
        throw e;
      }
      if (e instanceof QueryFailedError) {
        const qe = e as QueryFailedError & { driverError?: { code?: string; detail?: string; message?: string } };
        const msg = qe.message || '';
        const driverMsg = `${qe.driverError?.code ?? ''} ${qe.driverError?.detail ?? ''} ${qe.driverError?.message ?? ''}`;
        const combined = `${msg} ${driverMsg}`;
        if (
          qe.driverError?.code === '42703' ||
          combined.includes('pairedTruckId') ||
          combined.includes('paired_truck') ||
          (combined.includes('column') && combined.includes('does not exist'))
        ) {
          throw new BadRequestException(
            'La base n’a pas la colonne de jumelage. Dans Supabase (SQL), exécutez le fichier backend/sql-migrations/trucks-paired-truck-id.sql puis réessayez.',
          );
        }
        if (
          combined.toLowerCase().includes('unique') ||
          combined.toLowerCase().includes('duplicate key')
        ) {
          throw new BadRequestException(
            'Une immatriculation de ce couple existe déjà. Modifiez les plaques ou supprimez l’ancienne fiche.',
          );
        }
      }
      throw e;
    }
  }

  private async persistNewTruck(em: EntityManager, id: string, dto: CreateTruckDto): Promise<Truck> {
    let photo = dto.photo;
    if (dto.photo?.startsWith('data:image/')) {
      const bucket = process.env.SUPABASE_BUCKET_TRUCKS || 'truck-photos';
      const path = `trucks/${id}`;
      photo = await uploadImageFromDataUrl(bucket, path, dto.photo);
    }

    const { pairedTruckId: _p, ...dtoRest } = dto as CreateTruckDto & { pairedTruckId?: string };
    const truck = em.getRepository(Truck).create({
      id,
      ...dtoRest,
      photo,
    });
    return em.getRepository(Truck).save(truck);
  }

  async findAll(): Promise<Truck[]> {
    return this.truckRepository.find({
      relations: ['proprietaire', 'chauffeur'],
      order: { immatriculation: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Truck> {
    const truck = await this.truckRepository.findOne({
      where: { id },
      relations: ['proprietaire', 'chauffeur'],
    });
    if (!truck) throw new NotFoundException(`Camion ${id} introuvable`);
    return truck;
  }

  async update(id: string, dto: UpdateTruckDto): Promise<Truck> {
    await this.findOne(id);
    const dtoRecord = dto as Record<string, unknown>;
    const hasPairingKey = Object.prototype.hasOwnProperty.call(dtoRecord, 'pairedTruckId');
    const rawPair = hasPairingKey ? dtoRecord['pairedTruckId'] : undefined;
    const newPartnerId =
      rawPair === '' || rawPair === null || rawPair === undefined ? null : String(rawPair);

    const { pairedTruckId: _drop, ...restDto } = dtoRecord;
    let patch: Partial<Truck> = { ...(restDto as Partial<Truck>) };
    delete (patch as { pairedTruckId?: unknown }).pairedTruckId;
    delete (patch as { id?: unknown }).id;

    if (dto.photo && dto.photo.startsWith('data:image/')) {
      const bucket = process.env.SUPABASE_BUCKET_TRUCKS || 'truck-photos';
      const path = `trucks/${id}`;
      const uploaded = await uploadImageFromDataUrl(bucket, path, dto.photo);
      patch = { ...patch, photo: uploaded };
    }

    const keys = Object.keys(patch).filter((k) => (patch as Record<string, unknown>)[k] !== undefined);
    if (keys.length > 0) {
      await this.truckRepository.update(id, patch);
    }

    if (hasPairingKey) {
      await this.applyPairing(id, newPartnerId);
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const truck = await this.findOne(id);
    if (truck.pairedTruckId) {
      await this.truckRepository.update({ id: truck.pairedTruckId }, { pairedTruckId: null });
    }
    await this.truckRepository.delete(id);
  }

  /**
   * Met à jour le jumelage tracteur ↔ remorque (références réciproques `pairedTruckId`).
   */
  private async applyPairing(truckId: string, newPartnerId: string | null): Promise<void> {
    await this.truckRepository.manager.transaction(async (em) => {
      await this.applyPairingTx(em, truckId, newPartnerId);
    });
  }

  private async applyPairingTx(em: EntityManager, truckId: string, newPartnerId: string | null): Promise<void> {
    const repo = em.getRepository(Truck);

    const cur = await repo.findOne({ where: { id: truckId } });
    if (!cur) throw new NotFoundException(`Camion ${truckId} introuvable`);

    if (cur.pairedTruckId) {
      await repo.update({ id: cur.pairedTruckId }, { pairedTruckId: null });
    }
    await repo.update({ id: truckId }, { pairedTruckId: null });

    if (!newPartnerId) return;

    if (newPartnerId === truckId) {
      throw new BadRequestException('Un véhicule ne peut pas être jumelé à lui-même.');
    }

    const partner = await repo.findOne({ where: { id: newPartnerId } });
    if (!partner) throw new NotFoundException(`Véhicule partenaire ${newPartnerId} introuvable`);

    const okPair =
      (cur.type === 'tracteur' && partner.type === 'remorqueuse') ||
      (cur.type === 'remorqueuse' && partner.type === 'tracteur');
    if (!okPair) {
      throw new BadRequestException('Le jumelage requiert un tracteur et une remorque.');
    }

    if (partner.pairedTruckId && partner.pairedTruckId !== truckId) {
      await repo.update({ id: partner.pairedTruckId }, { pairedTruckId: null });
    }
    await repo.update({ id: newPartnerId }, { pairedTruckId: null });

    await repo.update({ id: truckId }, { pairedTruckId: newPartnerId });
    await repo.update({ id: newPartnerId }, { pairedTruckId: truckId });
  }
}
