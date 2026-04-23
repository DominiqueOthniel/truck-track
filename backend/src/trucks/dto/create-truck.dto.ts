import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsIn, IsUUID, ValidateIf } from 'class-validator';

const emptyToUndefined = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined || value === '') return undefined;
  return value;
};

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

  @Transform(emptyToUndefined)
  @ValidateIf((_: unknown, v: unknown) => v !== null && v !== undefined && v !== '')
  @IsUUID()
  @IsOptional()
  pairedTruckId?: string;
}
