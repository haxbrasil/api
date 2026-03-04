import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EnvSchema, validateEnv } from '../env/env.schema';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/auth.guard';
import { FilePersistenceModule } from './file-persistence/file-persistence.module';
import { RecordingsModule } from './recordings/recordings.module';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { buildRedisConnectionFromUrl } from '../common/utils/redis-connection.util';
import { RoomsModule } from './rooms/rooms.module';
import { RoomEventsModule } from './room-events/room-events.module';
import { RoomJobsModule } from './room-jobs/room-jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: validateEnv,
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvSchema, true>) => ({
        connection: buildRedisConnectionFromUrl(
          config.getOrThrow('REDIS_URL', { infer: true }),
        ),
      }),
    }),
    AuthModule,
    DatabaseModule,
    FilePersistenceModule,
    UsersModule,
    RecordingsModule,
    RoomsModule,
    RoomEventsModule,
    RoomJobsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
