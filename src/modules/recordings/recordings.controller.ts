import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiFoundResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  API_ERRORS,
  apiErrorPayload,
  apiErrorResponse,
} from '../../common/errors/api-error-response.util';
import { Tenant } from '../auth/decorators/tenant.decorator';
import { ListRecordingsQueryDto } from './dtos/list-recordings-query.dto';
import { RecordingResponseDto } from './dtos/recording-response.dto';
import { RecordingsPaginatedResponseDto } from './dtos/recordings-paginated-response.dto';
import { RecordingsService } from './recordings.service';

export const MAX_RECORDING_SIZE_BYTES = 5 * 1024 * 1024;

@ApiTags('recordings')
@Controller('recs')
export class RecordingsController {
  constructor(private readonly service: RecordingsService) {}

  @Post()
  @ApiOperation({
    summary: 'Upload recording',
    description:
      'Uploads a HaxBall recording and stores it on file persistence.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['recording'],
      properties: {
        recording: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiCreatedResponse({ type: RecordingResponseDto })
  @ApiBadRequestResponse(apiErrorResponse(API_ERRORS.RECORDING_INVALID))
  @ApiInternalServerErrorResponse(apiErrorResponse(API_ERRORS.PERSISTENCE))
  @UseInterceptors(FileInterceptor('recording'))
  async create(
    @Tenant() tenant: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<RecordingResponseDto> {
    if (!file) {
      throw new BadRequestException(
        apiErrorPayload(API_ERRORS.RECORDING_INVALID),
      );
    }

    if (file.size > MAX_RECORDING_SIZE_BYTES) {
      throw new BadRequestException(
        apiErrorPayload(API_ERRORS.RECORDING_INVALID),
      );
    }

    const result = await this.service.create(
      tenant,
      file.buffer,
      file.mimetype || 'application/octet-stream',
    );

    if (result.isErr()) {
      switch (result.error.type) {
        case 'recording_invalid':
          throw new BadRequestException(
            apiErrorPayload(API_ERRORS.RECORDING_INVALID),
          );
        case 'persistence_error':
        case 'file_persistence_error':
        case 'recording_code_generation_exhausted':
          throw new InternalServerErrorException(
            apiErrorPayload(API_ERRORS.PERSISTENCE),
          );
      }
    }

    return new RecordingResponseDto(result.value);
  }

  @Get()
  @ApiOperation({
    summary: 'List recording codes',
    description:
      'Lists recording codes with pagination for the authenticated tenant.',
  })
  @ApiOkResponse({ type: RecordingsPaginatedResponseDto })
  @ApiInternalServerErrorResponse(apiErrorResponse(API_ERRORS.PERSISTENCE))
  async list(
    @Tenant() tenant: string,
    @Query() query: ListRecordingsQueryDto,
  ): Promise<RecordingsPaginatedResponseDto> {
    const result = await this.service.list(tenant, query.page, query.pageSize);

    if (result.isErr()) {
      switch (result.error.type) {
        case 'persistence_error':
          throw new InternalServerErrorException(
            apiErrorPayload(API_ERRORS.PERSISTENCE),
          );
      }
    }

    return new RecordingsPaginatedResponseDto(result.value);
  }

  @Get(':code')
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({
    summary: 'Redirect to recording URL',
    description: 'Finds a recording by code and redirects to the object URL.',
  })
  @ApiParam({ name: 'code', example: 'A1B2C3' })
  @ApiFoundResponse({ description: 'Redirects to recording object URL.' })
  @ApiNotFoundResponse(apiErrorResponse(API_ERRORS.RECORDING_NOT_FOUND))
  @ApiInternalServerErrorResponse(apiErrorResponse(API_ERRORS.PERSISTENCE))
  async redirectByCode(
    @Tenant() tenant: string,
    @Param('code') code: string,
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.service.getByCode(tenant, code);

    if (result.isErr()) {
      switch (result.error.type) {
        case 'recording_not_found':
          throw new NotFoundException(
            apiErrorPayload(API_ERRORS.RECORDING_NOT_FOUND),
          );
        case 'persistence_error':
          throw new InternalServerErrorException(
            apiErrorPayload(API_ERRORS.PERSISTENCE),
          );
      }
    }

    response.redirect(HttpStatus.FOUND, result.value.url);
  }
}
