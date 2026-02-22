import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  camionId: string;

  @IsOptional()
  @IsString()
  tripId?: string;

  @IsOptional()
  @IsString()
  chauffeurId?: string;

  @IsString()
  categorie: string;

  @IsOptional()
  @IsString()
  sousCategorie?: string;

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
