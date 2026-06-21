import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @Length(6, 6, { message: 'code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'code must be exactly 6 digits' })
  code!: string;
}
