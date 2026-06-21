import { IsEmail, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
