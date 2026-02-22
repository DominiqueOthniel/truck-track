import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Truck } from '../entities/truck.entity';
import { CreateTruckDto } from './dto/create-truck.dto';
import { UpdateTruckDto } from './dto/update-truck.dto';

@Injectable()
export class TrucksService {
  constructor(
    @InjectRepository(Truck)
    private readonly truckRepository: Repository<Truck>,
  ) {}

  async create(dto: CreateTruckDto): Promise<Truck> {
    const truck = this.truckRepository.create({
      id: uuidv4(),
      ...dto,
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
    await this.truckRepository.update(id, dto as Partial<Truck>);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.truckRepository.delete(id);
  }
}
