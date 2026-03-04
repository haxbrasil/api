import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { UserPublicRow } from '../../database/database';
import { USER_ROLES, UserRole } from '../types/user-role.type';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  provider: string;

  @ApiProperty({ name: 'provider_user_id' })
  @Expose({ name: 'provider_user_id' })
  providerUserId: string;

  @ApiProperty()
  username: string;

  @ApiProperty({ enum: USER_ROLES })
  role: UserRole;

  @ApiProperty({ name: 'created_at', type: String, format: 'date-time' })
  @Expose({ name: 'created_at' })
  createdAt: Date;

  constructor(user: UserPublicRow) {
    this.id = user.id;
    this.provider = user.provider;
    this.providerUserId = user.providerUserId;
    this.username = user.username;
    this.role = user.role;
    this.createdAt = user.createdAt;
  }
}
