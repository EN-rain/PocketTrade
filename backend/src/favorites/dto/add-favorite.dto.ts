import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class AddFavoriteDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  listingId!: number;
}
