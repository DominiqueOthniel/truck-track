import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsNumber } from 'class-validator';

const emptyToUndefined = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
};

export class CreateExpenseDto {
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  camionId?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  tripId?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  chauffeurId?: string;

  @IsString()
  categorie: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  sousCategorie?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  fournisseurId?: string;

  @IsNumber()
  montant: number;

  @IsOptional()
  @IsNumber()
  quantite?: number;

  @IsOptional()
  @IsNumber()
  prixUnitaire?: number;

  @IsString()
  date: string;

  @IsString()
  description: string;
}
