import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';

export class CreateTripDto {
  @IsOptional()
  @IsString()
  tracteurId?: string;

  @IsOptional()
  @IsString()
  remorqueuseId?: string;

  @IsString()
  origine: string;

  @IsString()
  destination: string;

  @IsOptional()
  @IsNumber()
  origineLat?: number;

  @IsOptional()
  @IsNumber()
  origineLng?: number;

  @IsOptional()
  @IsNumber()
  destinationLat?: number;

  @IsOptional()
  @IsNumber()
  destinationLng?: number;

  @IsString()
  chauffeurId: string;

  @IsString()
  dateDepart: string;

  @IsOptional()
  @IsString()
  dateArrivee?: string;

  @IsNumber()
  recette: number;

  @IsOptional()
  @IsNumber()
  prefinancement?: number;

  @IsOptional()
  @IsString()
  client?: string;

  @IsOptional()
  @IsString()
  marchandise?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsIn(['planifie', 'en_cours', 'termine', 'annule'])
  statut: 'planifie' | 'en_cours' | 'termine' | 'annule';
}
