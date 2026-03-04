import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RoomEventsService } from './room-events.service';

const ROOM_EVENTS_CRON = '*/15 * * * * *';

@Injectable()
export class DeferredRoomEventsScheduler {
  private readonly logger = new Logger(DeferredRoomEventsScheduler.name);

  constructor(private readonly roomEventsService: RoomEventsService) {}

  @Cron(ROOM_EVENTS_CRON)
  async reconcileDeferredEvents(): Promise<void> {
    const result = await this.roomEventsService.reconcileDeferredEvents();

    if (result.isErr()) {
      this.logger.error(
        'Failed to reconcile deferred room events',
        result.error,
      );
    }
  }
}
