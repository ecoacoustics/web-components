export enum STATE {
  BUFFERS_AVAILABLE = 0,
  BUFFER_LENGTH = 1,
  FULL_BUFFER_LENGTH = 2,
  FINISHED_PROCESSING = 3,
}

export interface ISharedBuffers {
  states: SharedArrayBuffer;
  buffer: SharedArrayBuffer;
}

export type IWorkerSharedBuffers = ISharedBuffers & { canvas: OffscreenCanvas };
