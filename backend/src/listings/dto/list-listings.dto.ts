import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsEnum, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ListingCondition } from '@prisma/client';

export class ListListingsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  model?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsEnum(ListingCondition)
  condition?: ListingCondition;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  storage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(['newest', 'oldest', 'price_asc', 'price_desc', 'relevant'])
  sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'relevant' = 'newest';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
