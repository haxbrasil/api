import { ApiResponseOptions } from '@nestjs/swagger';
import { ApiError } from './api-error.enum';

export type ApiErrorDescriptor = Readonly<{
  code: ApiError;
  message: string;
  description?: string;
}>;

export const API_ERRORS = {
  PERSISTENCE: {
    code: ApiError.PERSISTENCE_ERROR,
    message: 'Unexpected error',
  },
  USER_ALREADY_EXISTS: {
    code: ApiError.USER_ALREADY_EXISTS,
    message: 'User already exists',
  },
  USER_NOT_FOUND: {
    code: ApiError.USER_NOT_FOUND,
    message: 'User not found',
  },
  RECORDING_INVALID: {
    code: ApiError.RECORDING_INVALID,
    message: 'Invalid recording file',
  },
  RECORDING_NOT_FOUND: {
    code: ApiError.RECORDING_NOT_FOUND,
    message: 'Recording not found',
  },
  ROOM_NOT_FOUND: {
    code: ApiError.ROOM_NOT_FOUND,
    message: 'Room not found',
  },
  ROOM_INACTIVE: {
    code: ApiError.ROOM_INACTIVE,
    message: 'Room is inactive',
  },
} as const satisfies Record<string, ApiErrorDescriptor>;

export function apiErrorPayload(error: ApiErrorDescriptor): {
  code: ApiError;
  message: string;
} {
  return {
    code: error.code,
    message: error.message,
  };
}

export function apiErrorResponse(
  error: ApiErrorDescriptor,
): ApiResponseOptions {
  return {
    description: error.description ?? error.message,
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: error.code },
        message: { type: 'string', example: error.message },
      },
      required: ['code', 'message'],
    },
  };
}
