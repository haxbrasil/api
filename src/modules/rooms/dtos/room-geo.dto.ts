import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Length, Matches } from 'class-validator';

export class RoomGeoDto {
  @ApiProperty({ example: 'BR', minLength: 2, maxLength: 2 })
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/)
  code!: string;

  @ApiProperty({ example: -23.55 })
  @IsNumber()
  lat!: number;

  @ApiProperty({ example: -46.63 })
  @IsNumber()
  lon!: number;
}
