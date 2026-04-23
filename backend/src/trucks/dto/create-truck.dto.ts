import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsIn, IsUUID, ValidateIf } from 'class-validator';

/** Chaîne vide → undefined (clé absente du JSON). Conserver `null` pour PATCH (retirer FK / jumelage). */
const optionalUuidFromClient = ({ value }: { value: unknown }) => {
  if (value === '' || value === undefined) return undefined;
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

  @Transform(optionalUuidFromClient)
  @IsOptional()
  @IsUUID()
  proprietaireId?: string | null;

  @Transform(optionalUuidFromClient)
  @IsOptional()
  @IsUUID()
  chauffeurId?: string | null;

  @Transform(optionalUuidFromClient)
  @IsOptional()
  @IsUUID()
  pairedTruckId?: string | null;
}
