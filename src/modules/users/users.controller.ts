import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Tenant } from '../auth/decorators/tenant.decorator';
import { ConfirmUserDto } from './dtos/confirm-user.dto';
import { ConfirmUserResponseDto } from './dtos/confirm-user-response.dto';
import { CreateUserDto } from './dtos/create-user.dto';
import { ListUsersQueryDto } from './dtos/list-users-query.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserResponseDto } from './dtos/user-response.dto';
import { UsersPaginatedResponseDto } from './dtos/users-paginated-response.dto';
import { UsersService } from './users.service';
import {
  API_ERRORS,
  apiErrorPayload,
  apiErrorResponse,
} from '../../common/errors/api-error-response.util';
import { ApiTag } from '../../common/swagger/api-tag.enum';

@ApiTags(ApiTag.USERS)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create user',
    description: 'Creates a user identity using provider and provider user id.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiConflictResponse(apiErrorResponse(API_ERRORS.USER_ALREADY_EXISTS))
  @ApiInternalServerErrorResponse(apiErrorResponse(API_ERRORS.PERSISTENCE))
  async create(
    @Tenant() tenant: string,
    @Body() body: CreateUserDto,
  ): Promise<UserResponseDto> {
    const result = await this.service.create(body, tenant);

    if (result.isErr()) {
      switch (result.error.type) {
        case 'user_already_exists':
          throw new ConflictException(
            apiErrorPayload(API_ERRORS.USER_ALREADY_EXISTS),
          );
        case 'persistence_error':
          throw new InternalServerErrorException(
            apiErrorPayload(API_ERRORS.PERSISTENCE),
          );
      }
    }

    return new UserResponseDto(result.value);
  }

  @Get()
  @ApiOperation({
    summary: 'List users',
    description: 'Lists users with pagination and optional username filter.',
  })
  @ApiOkResponse({ type: UsersPaginatedResponseDto })
  @ApiInternalServerErrorResponse(apiErrorResponse(API_ERRORS.PERSISTENCE))
  async list(
    @Tenant() tenant: string,
    @Query() query: ListUsersQueryDto,
  ): Promise<UsersPaginatedResponseDto> {
    const result = await this.service.list(tenant, query);

    if (result.isErr()) {
      switch (result.error.type) {
        case 'persistence_error':
          throw new InternalServerErrorException(
            apiErrorPayload(API_ERRORS.PERSISTENCE),
          );
      }
    }

    return new UsersPaginatedResponseDto(result.value);
  }

  @Get('provider/:provider/:providerUserId')
  @ApiOperation({
    summary: 'Get user by identity',
    description: 'Fetches a user by provider and provider user id.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse(apiErrorResponse(API_ERRORS.USER_NOT_FOUND))
  @ApiInternalServerErrorResponse(apiErrorResponse(API_ERRORS.PERSISTENCE))
  async getByIdentity(
    @Tenant() tenant: string,
    @Param('provider') provider: string,
    @Param('providerUserId') providerUserId: string,
  ): Promise<UserResponseDto> {
    const result = await this.service.getByIdentity(
      provider,
      providerUserId,
      tenant,
    );

    if (result.isErr()) {
      switch (result.error.type) {
        case 'user_not_found':
          throw new NotFoundException(
            apiErrorPayload(API_ERRORS.USER_NOT_FOUND),
          );
        case 'persistence_error':
          throw new InternalServerErrorException(
            apiErrorPayload(API_ERRORS.PERSISTENCE),
          );
      }
    }

    return new UserResponseDto(result.value);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update user by id',
    description: 'Updates mutable fields for a user by id.',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse(apiErrorResponse(API_ERRORS.USER_NOT_FOUND))
  @ApiConflictResponse(apiErrorResponse(API_ERRORS.USER_ALREADY_EXISTS))
  @ApiInternalServerErrorResponse(apiErrorResponse(API_ERRORS.PERSISTENCE))
  async update(
    @Tenant() tenant: string,
    @Param('id') userId: string,
    @Body() body: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const result = await this.service.update(userId, body, tenant);

    if (result.isErr()) {
      switch (result.error.type) {
        case 'user_not_found':
          throw new NotFoundException(
            apiErrorPayload(API_ERRORS.USER_NOT_FOUND),
          );
        case 'user_already_exists':
          throw new ConflictException(
            apiErrorPayload(API_ERRORS.USER_ALREADY_EXISTS),
          );
        case 'persistence_error':
          throw new InternalServerErrorException(
            apiErrorPayload(API_ERRORS.PERSISTENCE),
          );
      }
    }

    return new UserResponseDto(result.value);
  }

  @Post(':id/confirm')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Confirm user credentials',
    description:
      'Validates the provided password for a user id and returns whether it matches.',
  })
  @ApiBody({ type: ConfirmUserDto })
  @ApiOkResponse({ type: ConfirmUserResponseDto })
  @ApiInternalServerErrorResponse(apiErrorResponse(API_ERRORS.PERSISTENCE))
  async confirm(
    @Tenant() tenant: string,
    @Param('id') userId: string,
    @Body() body: ConfirmUserDto,
  ): Promise<ConfirmUserResponseDto> {
    const result = await this.service.confirm(userId, body, tenant);

    if (result.isErr()) {
      switch (result.error.type) {
        case 'persistence_error':
          throw new InternalServerErrorException(
            apiErrorPayload(API_ERRORS.PERSISTENCE),
          );
      }
    }

    return new ConfirmUserResponseDto(result.value);
  }
}
