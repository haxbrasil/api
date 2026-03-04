import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RoomGeoDto } from './room-geo.dto';

export class CreateRoomDto {
  @ApiProperty({ minLength: 1, maxLength: 255, example: 'DDWvwykDyiI' })
  @IsString()
  @Length(1, 255)
  invite!: string;

  @ApiProperty({ minLength: 1, maxLength: 150, example: 'Hax Brasil Room #1' })
  @IsString()
  @Length(1, 150)
  name!: string;

  @ApiPropertyOptional({
    name: 'player_name',
    type: String,
    nullable: true,
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Length(1, 100)
  player_name?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    minLength: 1,
    maxLength: 255,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Length(1, 255)
  password?: string | null;

  @ApiPropertyOptional({ type: Boolean, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsBoolean()
  public?: boolean | null;

  @ApiPropertyOptional({
    name: 'max_players',
    type: Number,
    nullable: true,
    minimum: 1,
    maximum: 30,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(30)
  max_players?: number | null;

  @ApiPropertyOptional({ type: RoomGeoDto, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @ValidateNested()
  @Type(() => RoomGeoDto)
  geo?: RoomGeoDto | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    minLength: 1,
    maxLength: 1024,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Length(1, 1024)
  token?: string | null;

  @ApiPropertyOptional({ name: 'no_player', type: Boolean, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsBoolean()
  no_player?: boolean | null;
}
