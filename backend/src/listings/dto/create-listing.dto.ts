import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ListingCondition } from '@prisma/client';

export class CreateListingDto {
  @IsString()
  @IsNotEmpty()
  brand: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  price: number;

  @IsEnum(ListingCondition)
  condition: ListingCondition;

  @IsString()
  @IsNotEmpty()
  storage: string;

  @IsString()
  @IsOptional()
  colour?: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsString()
  @IsNotEmpty()
  location: string;
}