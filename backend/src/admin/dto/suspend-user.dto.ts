import { IsOptional, IsString } from 'class-validator';

export class SuspendUserDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
