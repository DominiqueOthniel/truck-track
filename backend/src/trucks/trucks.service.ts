import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Truck } from '../entities/truck.entity';
import { CreateTruckDto } from './dto/create-truck.dto';
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

    let photo = dto.photo;
    if (dto.photo?.startsWith('data:image/')) {
      const bucket = process.env.SUPABASE_BUCKET_TRUCKS || 'truck-photos';
      const path = `trucks/${id}`;
      photo = await uploadImageFromDataUrl(bucket, path, dto.photo);
    }

    const { pairedTruckId: _p, ...dtoRest } = dto as CreateTruckDto & { pairedTruckId?: string };
    const truck = this.truckRepository.create({
      id,
      ...dtoRest,
      photo,
    });
    return this.truckRepository.save(truck);
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
    });
  }
}
