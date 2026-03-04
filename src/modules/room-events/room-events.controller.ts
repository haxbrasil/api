import {
  ConflictException,
  Controller,
  Get,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Query,
  Body,
  Res,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import {
  API_ERRORS,
  apiErrorPayload,
  apiErrorResponse,
} from '../../common/errors/api-error-response.util';
import { ApiTag } from '../../common/swagger/api-tag.enum';
import { Tenant } from '../auth/decorators/tenant.decorator';
import { CreateRoomEventDto } from './dtos/create-room-event.dto';
import { DeferredRoomEventResponseDto } from './dtos/deferred-room-event-response.dto';
import { ListRoomEventsQueryDto } from './dtos/list-room-events-query.dto';
import { RoomEventResponseDto } from './dtos/room-event-response.dto';
import { RoomEventsPaginatedResponseDto } from './dtos/room-events-paginated-response.dto';
import { RoomEventsService } from './room-events.service';

@ApiTags(ApiTag.ROOM_EVENTS)
@Controller('rooms')
export class RoomEventsController {
  constructor(private readonly service: RoomEventsService) {}

  @Post('events')
  @ApiOperation({
    summary: 'Create room event',
    description:
      'Stores a room event for an active room or defers it until the room appears.',
  })
  @ApiCreatedResponse({ type: RoomEventResponseDto })
  @ApiAcceptedResponse({ type: DeferredRoomEventResponseDto })
  @ApiConflictResponse(apiErrorResponse(API_ERRORS.ROOM_INACTIVE))
  @ApiInternalServerErrorResponse(apiErrorResponse(API_ERRORS.PERSISTENCE))
  async create(
    @Tenant() tenant: string,
    @Body() body: CreateRoomEventDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RoomEventResponseDto | DeferredRoomEventResponseDto> {
    const result = await this.service.createEvent(tenant, body);

    if (result.isErr()) {
      switch (result.error.type) {
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

    if (result.value.state === 'deferred') {
      response.status(HttpStatus.ACCEPTED);
      return new DeferredRoomEventResponseDto(result.value.event);
    }

    return new RoomEventResponseDto(result.value.event);
  }

  @Get(':uuid/events')
  @ApiOperation({
    summary: 'List room events',
    description: 'Lists room events for a room uuid with pagination.',
  })
  @ApiOkResponse({ type: RoomEventsPaginatedResponseDto })
  @ApiNotFoundResponse(apiErrorResponse(API_ERRORS.ROOM_NOT_FOUND))
  @ApiInternalServerErrorResponse(apiErrorResponse(API_ERRORS.PERSISTENCE))
  async listByRoom(
    @Tenant() tenant: string,
    @Param('uuid') roomId: string,
    @Query() query: ListRoomEventsQueryDto,
  ): Promise<RoomEventsPaginatedResponseDto> {
    const result = await this.service.listByRoom(
      tenant,
      roomId,
      query.page,
      query.page_size,
    );

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

    return new RoomEventsPaginatedResponseDto(result.value);
  }
}
