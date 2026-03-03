export type Recording = {
  id: string;
  tenant: string;
  code: string;
  recordingUuid: string;
  url: string;
  createdAt: Date;
};

export type RecordingInputData = {
  tenant: string;
  code: string;
  recordingUuid: string;
  url: string;
};
