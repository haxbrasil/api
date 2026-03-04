import { Module } from '@nestjs/common';
import { RoomsModule } from '../rooms/rooms.module';
import { DeferredRoomEventsScheduler } from './deferred-room-events.scheduler';
import { RoomEventsController } from './room-events.controller';
import { RoomEventsRepository } from './room-events.repository';
import { RoomEventsService } from './room-events.service';

@Module({
  imports: [RoomsModule],
  controllers: [RoomEventsController],
  providers: [
    RoomEventsRepository,
    RoomEventsService,
    DeferredRoomEventsScheduler,
  ],
  exports: [RoomEventsService],
})
export class RoomEventsModule {}
