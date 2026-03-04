import {
  Body,
  ConflictException,
  Controller,
  Delete,
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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  API_ERRORS,
  apiErrorPayload,
  apiErrorResponse,
} from '../../common/api/errors/api-error-response.util';
import { ApiTag } from '../../common/api/swagger/api-tag.enum';
import { Tenant } from '../auth/decorators/tenant.decorator';
import { CreateRoomDto } from './dtos/create-room.dto';
import { ListRoomsQueryDto } from './dtos/list-rooms-query.dto';
import { RoomResponseDto } from './dtos/room-response.dto';
import { RoomsPaginatedResponseDto } from './dtos/rooms-paginated-response.dto';
import { UpdateRoomDto } from './dtos/update-room.dto';
import { RoomsService } from './rooms.service';

@ApiTags(ApiTag.ROOMS)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly service: RoomsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create room',
    description: 'Registers a room as active for the authenticated tenant.',
  })
  @ApiCreatedResponse({ type: RoomResponseDto })
  @ApiInternalServerErrorResponse(apiErrorResponse(API_ERRORS.PERSISTENCE))
  async create(
    @Tenant() tenant: string,
    @Body() body: CreateRoomDto,
  ): Promise<RoomResponseDto> {
    const result = await this.service.create(tenant, body);

    if (result.isErr()) {
      switch (result.error.type) {
        case 'persistence_error':
          throw new InternalServerErrorException(
            apiErrorPayload(API_ERRORS.PERSISTENCE),
          );
      }
    }

    return new RoomResponseDto(result.value);
  }

  @Get()
  @ApiOperation({
    summary: 'List rooms',
    description:
      'Lists rooms with pagination, optional name filter, and optional inclusion of inactive rooms.',
  })
  @ApiOkResponse({ type: RoomsPaginatedResponseDto })
  @ApiInternalServerErrorResponse(apiErrorResponse(API_ERRORS.PERSISTENCE))
  async list(
    @Tenant() tenant: string,
    @Query() query: ListRoomsQueryDto,
  ): Promise<RoomsPaginatedResponseDto> {
    const result = await this.service.list(tenant, query);

    if (result.isErr()) {
      switch (result.error.type) {
        case 'persistence_error':
          throw new InternalServerErrorException(
            apiErrorPayload(API_ERRORS.PERSISTENCE),
          );
      }
    }

    return new RoomsPaginatedResponseDto(result.value);
  }

  @Get(':uuid')
  @ApiOperation({
    summary: 'Get room',
    description: 'Fetches one room by uuid for the authenticated tenant.',
  })
  @ApiOkResponse({ type: RoomResponseDto })
  @ApiNotFoundResponse(apiErrorResponse(API_ERRORS.ROOM_NOT_FOUND))
  @ApiInternalServerErrorResponse(apiErrorResponse(API_ERRORS.PERSISTENCE))
  async getById(
    @Tenant() tenant: string,
    @Param('uuid') roomId: string,
  ): Promise<RoomResponseDto> {
    const result = await this.service.getById(tenant, roomId);

    if (result.isErr()) {
      switch (result.error.type) {
        case 'room_not_found':
          throw new NotFoundException(
            apiErrorPayload(API_ERRORS.ROOM_NOT_FOUND),
          );
        case 'persistence_error':
          throw new InternalServerErrorException(
            apiErrorPayload(API_ERRORS.PERSISTENCE),
          );
      }
    }

    return new RoomResponseDto(result.value);
  }

  @Put(':uuid')
  @ApiOperation({
    summary: 'Update room',
    description: 'Updates room fields. Only active rooms can be edited.',
  })
  @ApiOkResponse({ type: RoomResponseDto })
  @ApiNotFoundResponse(apiErrorResponse(API_ERRORS.ROOM_NOT_FOUND))
  @ApiConflictResponse(apiErrorResponse(API_ERRORS.ROOM_INACTIVE))
  @ApiInternalServerErrorResponse(apiErrorResponse(API_ERRORS.PERSISTENCE))
  async update(
    @Tenant() tenant: string,
    @Param('uuid') roomId: string,
    @Body() body: UpdateRoomDto,
  ): Promise<RoomResponseDto> {
    const result = await this.service.update(tenant, roomId, body);

    if (result.isErr()) {
      switch (result.error.type) {
        case 'room_not_found':
          throw new NotFoundException(
            apiErrorPayload(API_ERRORS.ROOM_NOT_FOUND),
          );
        case 'room_inactive':
          throw new ConflictException(
            apiErrorPayload(API_ERRORS.ROOM_INACTIVE),
          );
        case 'persistence_error':
          throw new InternalServerErrorException(
            apiErrorPayload(API_ERRORS.PERSISTENCE),
          );
      }
    }

    return new RoomResponseDto(result.value);
  }

  @Delete(':uuid')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Deactivate room',
    description: 'Marks a room as inactive. Operation is idempotent.',
  })
  @ApiNoContentResponse({ description: 'Room deactivated.' })
  @ApiNotFoundResponse(apiErrorResponse(API_ERRORS.ROOM_NOT_FOUND))
  @ApiInternalServerErrorResponse(apiErrorResponse(API_ERRORS.PERSISTENCE))
  async deactivate(
    @Tenant() tenant: string,
    @Param('uuid') roomId: string,
  ): Promise<void> {
    const result = await this.service.deactivate(tenant, roomId);

    if (result.isErr()) {
      switch (result.error.type) {
        case 'room_not_found':
          throw new NotFoundException(
            apiErrorPayload(API_ERRORS.ROOM_NOT_FOUND),
          );
        case 'persistence_error':
          throw new InternalServerErrorException(
            apiErrorPayload(API_ERRORS.PERSISTENCE),
          );
      }
    }
  }
}
