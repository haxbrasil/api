import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsString,
  IsNotEmpty,
  IsOptional,
  validateSync,
} from 'class-validator';
import { plainToInstance } from 'class-transformer';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvSchema {
  @IsEnum(NodeEnv)
  NODE_ENV!: NodeEnv;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_PUBLIC_KEY!: string;

  @IsString()
  @IsNotEmpty()
  JWT_PRIVATE_KEY!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ALGO!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ISS!: string;

  @IsString()
  @IsNotEmpty()
  JWT_AUD!: string;

  @IsString()
  @IsNotEmpty()
  JWT_EXP!: string;

  @IsNumber()
  PORT!: number;

  @IsString()
  @IsNotEmpty()
  FILE_STORAGE_ENDPOINT!: string;

  @IsString()
  @IsNotEmpty()
  FILE_STORAGE_REGION!: string;

  @IsString()
  @IsNotEmpty()
  FILE_STORAGE_ACCESS_KEY_ID!: string;

  @IsString()
  @IsNotEmpty()
  FILE_STORAGE_SECRET_ACCESS_KEY!: string;

  @IsString()
  @IsNotEmpty()
  FILE_STORAGE_BUCKET!: string;

  @IsString()
  @IsNotEmpty()
  FILE_STORAGE_PUBLIC_BASE_URL!: string;

  @IsOptional()
  @IsBoolean()
  FILE_STORAGE_FORCE_PATH_STYLE: boolean = false;
}

export function validateEnv(config: Record<string, unknown>): EnvSchema {
  const validated = plainToInstance(EnvSchema, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const formatted = errors
      .map((err) => Object.values(err.constraints ?? {}).join(', '))
      .join('; ');

    throw new Error(`❌ Invalid environment variables: ${formatted}`);
  }

  return validated;
}
