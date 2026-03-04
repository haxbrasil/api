import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RECORDING_FIXTURE_PATH = resolve(__dirname, 'assets/recording-01.hbr2');

export function recordingFixtureBytes(): Buffer {
  return readFileSync(RECORDING_FIXTURE_PATH);
}

export function recordingFormDataFixture(
  fileBytes = recordingFixtureBytes(),
): FormData {
  const formData = new FormData();
  formData.set(
    'recording',
    new Blob([new Uint8Array(fileBytes)], {
      type: 'application/octet-stream',
    }),
    'recording.hbr2',
  );

  return formData;
}
