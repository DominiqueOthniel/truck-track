import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateTruckDto {
  @IsString()
  immatriculation: string;

  @IsString()
  modele: string;

  @IsString()
  @IsIn(['tracteur', 'remorqueuse'])
  type: 'tracteur' | 'remorqueuse';

  @IsString()
  @IsIn(['actif', 'inactif'])
  statut: 'actif' | 'inactif';

  @IsString()
  dateMiseEnCirculation: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsString()
  proprietaireId?: string;

  @IsOptional()
  @IsString()
  chauffeurId?: string;
}
