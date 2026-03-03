export function buildRecordingStorageKey(
  tenant: string,
  code: string,
  recordingUuid: string,
): string {
  return `${tenant}-${code}-${recordingUuid}`;
}
