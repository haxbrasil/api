import {
  Body,
  Controller,
  HttpStatus,
  InternalServerErrorException,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import {
  API_ERRORS,
  apiErrorPayload,
  apiErrorResponse,
} from '../../common/errors/api-error-response.util';
import { ApiTag } from '../../common/swagger/api-tag.enum';
import { Tenant } from '../auth/decorators/tenant.decorator';
import { CreateRoomJobDto } from './dtos/create-room-job.dto';
import { RoomJobFailedResponseDto } from './dtos/room-job-failed-response.dto';
import { RoomJobOpenResponseDto } from './dtos/room-job-open-response.dto';
import { RoomJobPendingResponseDto } from './dtos/room-job-pending-response.dto';
import { RoomJobsService } from './room-jobs.service';

@ApiTags(ApiTag.ROOM_JOBS)
@Controller('room-jobs')
export class RoomJobsController {
  constructor(private readonly service: RoomJobsService) {}

  @Post()
  @ApiOperation({
    summary: 'Request room opening',
    description:
      'Enqueues a room opening job and waits up to 15 seconds for completion.',
  })
  @ApiBody({ type: CreateRoomJobDto })
  @ApiOkResponse({ type: RoomJobOpenResponseDto })
  @ApiAcceptedResponse({ type: RoomJobPendingResponseDto })
  @ApiUnprocessableEntityResponse({ type: RoomJobFailedResponseDto })
  @ApiInternalServerErrorResponse(apiErrorResponse(API_ERRORS.PERSISTENCE))
  async create(
    @Tenant() tenant: string,
    @Body() body: CreateRoomJobDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<
    | RoomJobOpenResponseDto
    | RoomJobFailedResponseDto
    | RoomJobPendingResponseDto
  > {
    const result = await this.service.create(tenant, body);

    if (result.isErr()) {
      throw new InternalServerErrorException(
        apiErrorPayload(API_ERRORS.PERSISTENCE),
      );
    }

    switch (result.value.state) {
      case 'open':
        response.status(HttpStatus.OK);
        return new RoomJobOpenResponseDto(result.value);
      case 'failed':
        response.status(HttpStatus.UNPROCESSABLE_ENTITY);
        return new RoomJobFailedResponseDto(result.value);
      case 'pending':
        response.status(HttpStatus.ACCEPTED);
        return new RoomJobPendingResponseDto(result.value);
    }
  }
}
