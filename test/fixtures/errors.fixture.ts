export function persistenceErrorFixture(context: string): {
  type: 'persistence_error';
  cause: Error;
} {
  return {
    type: 'persistence_error',
    cause: new Error(`forced ${context} persistence failure`),
  };
}

export function roomJobQueueErrorFixture(): {
  type: 'room_job_queue_error';
  cause: Error;
} {
  return {
    type: 'room_job_queue_error',
    cause: new Error('forced room jobs queue failure'),
  };
}
