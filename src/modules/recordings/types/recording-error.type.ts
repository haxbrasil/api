export type RecordingInvalidError = {
  type: 'recording_invalid';
};

export type RecordingNotFoundError = {
  type: 'recording_not_found';
  code: string;
};

export type RecordingCodeCollisionError = {
  type: 'recording_code_collision';
  code: string;
  tenant: string;
};

export type RecordingCodeGenerationExhaustedError = {
  type: 'recording_code_generation_exhausted';
};
