import { IsE164 } from '../../common/validators/is-e164.validator';

export class RequestOtpDto {
  @IsE164({ message: 'mobileNumber must be a valid E.164 phone number (e.g. +14155552671)' })
  mobileNumber!: string;
}
