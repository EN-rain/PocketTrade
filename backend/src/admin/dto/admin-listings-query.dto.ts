import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ListingCondition, ListingStatus } from '@prisma/client';

export class AdminListingsQueryDto {
  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}