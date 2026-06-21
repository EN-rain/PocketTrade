import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  MinLength,
  IsEnum,
  IsOptional,
  Max,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ListingCondition } from '@prisma/client';

export class CreateListingDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  brand: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  model: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  price: number;

  @IsEnum(ListingCondition)
  condition: ListingCondition;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  storage: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(40)
  colour?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  location: string;
}
