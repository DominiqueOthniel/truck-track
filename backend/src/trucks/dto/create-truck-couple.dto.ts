import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

const emptyToUndefined = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined || value === '') return undefined;
  return value;
};

/** Création atomique tracteur + remorque jumelés (une transaction). */
export class CreateTruckCoupleDto {
  @IsString()
  tracteurImmatriculation: string;

  @IsString()
  remorqueImmatriculation: string;

  @IsString()
  modele: string;

  @IsString()
  @IsIn(['actif', 'inactif'])
  statut: 'actif' | 'inactif';

  @IsString()
  dateMiseEnCirculation: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @Transform(emptyToUndefined)
  @ValidateIf((_: unknown, v: unknown) => v !== null && v !== undefined && v !== '')
  @IsUUID()
  @IsOptional()
  proprietaireId?: string;

  @Transform(emptyToUndefined)
  @ValidateIf((_: unknown, v: unknown) => v !== null && v !== undefined && v !== '')
  @IsUUID()
  @IsOptional()
  chauffeurId?: string;
}
