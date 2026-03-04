import { RecordingRow } from '../../database/database';

export type Recording = RecordingRow;

export type RecordingInputData = {
  tenant: string;
  code: string;
  recordingUuid: string;
  url: string;
};
