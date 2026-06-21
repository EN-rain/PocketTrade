import { Type, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

class NotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  messages?: boolean;

  @IsOptional()
  @IsBoolean()
  listingUpdates?: boolean;
}

export class UpdateMeDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  location?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notificationPreferences?: NotificationPreferencesDto;
}
