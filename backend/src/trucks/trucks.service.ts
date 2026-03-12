import { Injectable, NotFoundException } from '@nestjs/common';
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

    const truck = this.truckRepository.create({
      id,
      ...dto,
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
    let patch: Partial<Truck> = dto as Partial<Truck>;

    if (dto.photo && dto.photo.startsWith('data:image/')) {
      const bucket = process.env.SUPABASE_BUCKET_TRUCKS || 'truck-photos';
      const path = `trucks/${id}`;
      const uploaded = await uploadImageFromDataUrl(bucket, path, dto.photo);
      patch = { ...patch, photo: uploaded };
    }

    await this.truckRepository.update(id, patch);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.truckRepository.delete(id);
  }
}
