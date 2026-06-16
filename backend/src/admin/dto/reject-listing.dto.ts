import { IsOptional, IsString } from 'class-validator';

export class RejectListingDto {
  @IsOptional()
  @IsString()
  reason?: string;
}