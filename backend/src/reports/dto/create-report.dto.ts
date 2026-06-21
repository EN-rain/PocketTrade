import { Type, Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ReportReason } from '@prisma/client';

export class CreateReportDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  reportedUserId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  reportedListingId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  conversationId?: number;

  @IsEnum(ReportReason)
  reason!: ReportReason;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(2000)
  details?: string;
}
