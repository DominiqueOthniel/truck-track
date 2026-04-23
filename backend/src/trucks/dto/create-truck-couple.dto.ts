import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

const optionalUuidFromClient = ({ value }: { value: unknown }) => {
  if (value === '' || value === undefined) return undefined;
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

  @Transform(optionalUuidFromClient)
  @IsOptional()
  @IsUUID()
  proprietaireId?: string | null;

  @Transform(optionalUuidFromClient)
  @IsOptional()
  @IsUUID()
  chauffeurId?: string | null;
}
