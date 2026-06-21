import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SuspendUserDto {
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;
}
