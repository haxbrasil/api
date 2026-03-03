import { DocumentBuilder } from '@nestjs/swagger';
import { ApiTag } from 'src/common/swagger/api-tag.enum';

export const SWAGGER_PATH = 'api';

export function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('Hax Brasil API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'bearer',
    )
    .addSecurityRequirements('bearer')
    .addTag(
      ApiTag.USERS,
      'Endpoints related to user management and authentication',
    )
    .addTag(ApiTag.RECORDINGS, 'Endpoints related to recording management')
    .build();
}
