import { IsE164 } from '../../common/validators/is-e164.validator';
import { IsString, Length, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsE164({ message: 'mobileNumber must be a valid E.164 phone number (e.g. +14155552671)' })
  mobileNumber!: string;

  @IsString()
  @Length(6, 6, { message: 'code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'code must be exactly 6 digits' })
  code!: string;
}
