import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Trip } from '../entities/trip.entity';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { ExpensesService } from '../expenses/expenses.service';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>,
    private readonly expensesService: ExpensesService,
  ) {}

  async create(dto: CreateTripDto): Promise<Trip> {
    const trip = this.tripRepository.create({
      id: uuidv4(),
      ...dto,
    });
    const saved = await this.tripRepository.save(trip);
    await this.expensesService.syncTripPrefinancementExpense(saved, saved.prefinancement);
    return saved;
  }

  async findAll(): Promise<Trip[]> {
    return this.tripRepository.find({
      relations: ['tracteur', 'remorqueuse', 'chauffeur'],
      order: { dateDepart: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Trip> {
    const trip = await this.tripRepository.findOne({
      where: { id },
      relations: ['tracteur', 'remorqueuse', 'chauffeur'],
    });
    if (!trip) throw new NotFoundException(`Trajet ${id} introuvable`);
    return trip;
  }

  async update(id: string, dto: UpdateTripDto): Promise<Trip> {
    await this.findOne(id);
    await this.tripRepository.update(id, dto as Partial<Trip>);
    const after = await this.findOne(id);
    await this.expensesService.syncTripPrefinancementExpense(after, after.prefinancement);
    return after;
  }

  async remove(id: string): Promise<void> {
    const trip = await this.findOne(id);
    await this.expensesService.syncTripPrefinancementExpense(trip, 0);
    await this.tripRepository.delete(id);
  }
}
