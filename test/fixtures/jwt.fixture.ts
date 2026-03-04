import { JwtService } from '@nestjs/jwt';
import { getE2ERuntime } from '../support/runtime';

function flipSignatureChar(value: string): string {
  const last = value.slice(-1);

  if (last === 'a') {
    return `${value.slice(0, -1)}b`;
  }

  return `${value.slice(0, -1)}a`;
}

export function signCustomToken(payload: Record<string, unknown>): string {
  const jwt = getE2ERuntime().app.get(JwtService);

  return jwt.sign(payload);
}

export function tamperTokenSignature(token: string): string {
  const parts = token.split('.');

  if (parts.length !== 3 || parts[2].length === 0) {
    return `${token}x`;
  }

  return `${parts[0]}.${parts[1]}.${flipSignatureChar(parts[2])}`;
}
