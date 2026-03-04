import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { Room } from '../types/room.type';
import { RoomGeoDto } from './room-geo.dto';

export class RoomResponseDto {
  @ApiProperty({ name: 'uuid' })
  @Expose({ name: 'uuid' })
  uuid: string;

  @ApiProperty()
  invite: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ name: 'player_name', type: String, nullable: true })
  @Expose({ name: 'player_name' })
  playerName: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  password: string | null;

  @ApiPropertyOptional({ type: Boolean, nullable: true })
  public: boolean | null;

  @ApiPropertyOptional({ name: 'max_players', type: Number, nullable: true })
  @Expose({ name: 'max_players' })
  maxPlayers: number | null;

  @ApiPropertyOptional({ type: RoomGeoDto, nullable: true })
  @Type(() => RoomGeoDto)
  geo: RoomGeoDto | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  token: string | null;

  @ApiPropertyOptional({ name: 'no_player', type: Boolean, nullable: true })
  @Expose({ name: 'no_player' })
  noPlayer: boolean | null;

  @ApiProperty()
  active: boolean;

  @ApiPropertyOptional({
    name: 'inactivated_at',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  @Expose({ name: 'inactivated_at' })
  inactivatedAt: Date | null;

  @ApiProperty({ name: 'created_at', type: String, format: 'date-time' })
  @Expose({ name: 'created_at' })
  createdAt: Date;

  constructor(room: Room) {
    this.uuid = room.id;
    this.invite = room.invite;
    this.name = room.name;
    this.playerName = room.playerName;
    this.password = room.password;
    this.public = room.public;
    this.maxPlayers = room.maxPlayers;
    this.geo = room.geo;
    this.token = room.token;
    this.noPlayer = room.noPlayer;
    this.active = room.active;
    this.inactivatedAt = room.inactivatedAt;
    this.createdAt = room.createdAt;
  }
}
