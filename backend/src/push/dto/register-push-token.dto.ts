import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterPushTokenDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(16)
  @MaxLength(4096)
  token!: string;

  @IsString()
  @IsIn(['android', 'ios', 'web'])
  platform!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(200)
  deviceId?: string;
}
