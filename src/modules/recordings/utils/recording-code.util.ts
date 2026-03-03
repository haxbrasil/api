export const RECORDING_CODE_LENGTH = 6;
const RECORDING_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateRecordingCode(
  nextIndex: (maxExclusive: number) => number,
): string {
  let code = '';

  for (let index = 0; index < RECORDING_CODE_LENGTH; index += 1) {
    const alphabetIndex = nextIndex(RECORDING_CODE_ALPHABET.length);
    code +=
      RECORDING_CODE_ALPHABET[alphabetIndex] ?? RECORDING_CODE_ALPHABET[0];
  }

  return code;
}
