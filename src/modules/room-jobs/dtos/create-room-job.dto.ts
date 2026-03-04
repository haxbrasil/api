import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsOptional, IsString, Length } from 'class-validator';

export class CreateRoomJobDto {
  @ApiProperty({ name: 'room_type', example: 'futsal-3v3' })
  @IsString()
  @Length(1, 100)
  room_type!: string;

  @ApiProperty({ name: 'room_properties' })
  @IsDefined()
  room_properties!: unknown;

  @ApiPropertyOptional({ nullable: true, minLength: 1, maxLength: 1024 })
  @IsOptional()
  @IsString()
  @Length(1, 1024)
  token?: string;
}
