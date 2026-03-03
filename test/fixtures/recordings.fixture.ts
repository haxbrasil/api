import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RECORDING_FIXTURE_PATH = resolve(__dirname, 'recording-01.hbr2');

export function recordingFixtureBytes(): Buffer {
  return readFileSync(RECORDING_FIXTURE_PATH);
}
