/**
 * There are names for indexes in a packed struct stored in a SharedArrayBuffer
 *
 * @example
 * ```ts
 * const stateBuffer = new SharedArrayBuffer(4 * Int32Array.BYTES_PER_ELEMENT);
 * const states = new Int32Array(stateBuffer);
 * ```
 *
 * States is equivalent to the following:
 * @example
 * ```ts
 * [
 *     STATE.BUFFERS_AVAILABLE,
 *     STATE.BUFFER_WRITE_HEAD,
 *     STATE.FULL_BUFFER_LENGTH,
 *     STATE.FINISHED_PROCESSING
 * ]
 * ```
 */
enum STATE {
  // if the shared buffer is full, and available to be processed
  // BUFFERS_AVAILABLE will be set to 1 (true)
  // This should cause the canvas worker to process the buffer and create an fft
  //* Type: Boolean
  BUFFERS_AVAILABLE = 0,

  // this is the index where the last sample has been written to in the buffer
  // this can be used by the processor to determine where to write next
  // it is also used by the worker to determine where to stop reading from the buffer
  //* Type: Int32
  BUFFER_WRITE_HEAD = 1,

  // after how many samples should the buffer be considered full and the worker be activated
  //* Type: Int32
  FULL_BUFFER_LENGTH = 2,

  // If there is no more work to be done, this value will be set to one
  // indicating to the worker that it should terminate itself
  //* Type: Boolean
  FINISHED_PROCESSING = 3,
}

export type SharedBuffers = [state: SharedArrayBuffer, sampleBuffer: SharedArrayBuffer];

export type SharedBuffersWithCanvas = [
  state: SharedArrayBuffer,
  sampleBuffer: SharedArrayBuffer,
  canvas: OffscreenCanvas,
  spectrogramOptions: SpectrogramOptions
];

export function getSharedProcessorState(buffers: SharedBuffers): ProcessorState {
  return new ProcessorState(new Int32Array(buffers[0]));
}

export function getSharedWorkerState(buffers: SharedBuffersWithCanvas): WorkerState {
  return new WorkerState(new Int32Array(buffers[0]));
}

export function getSharedBuffer(buffers: SharedBuffers | SharedBuffersWithCanvas): Float32Array {
  return new Float32Array(buffers[1]);
}

export function getSharedCanvas(buffers: SharedBuffersWithCanvas): OffscreenCanvas {
  return buffers[2];
}

export function getSpectrogramOptions(buffers: SharedBuffersWithCanvas): SpectrogramOptions {
  return buffers[3];
}

export const MESSAGE_PROCESSOR_READY = "processor-ready";

// TODO: some kind of well known set of strings, probably the D3 colour schemes
// maybe even extensible to allow custom colour maps e.g. 
// https://d3js.org/d3-scale-chromatic
type ColorMap = string;

export class SpectrogramOptions {
  sampleRate: number;
  constructor(
    windowSize: number,
    
    windowOverlap: number,
    windowFunction: string,
    brightness: number,
    contrast: number,
    sampleRate: number,
    colorMap: ColorMap
  ) {
    this.windowSize = windowSize;
    this.windowOverlap = windowOverlap;
    this.windowFunction = windowFunction;
    this.brightness = brightness;
    this.contrast = contrast;
    this.sampleRate = sampleRate;
    this.colorMap = colorMap;
  }

  /** number of samples in each window for the fft
   *  must be a power of 2
   */
  public windowSize: number;
  /**
   *  number of samples to overlap between windows
   */ 
  public windowOverlap: number;
  public windowFunction: string;
  public brightness: number;
  public contrast: number;
  public colorMap: ColorMap;
}

const TRUE = 1 as const;
const FALSE = 0 as const;
export class State {
  constructor(state: Int32Array) {
    this.state = state;
  }

  protected state: Int32Array;

  public get buffer(): SharedArrayBuffer {
    // we control creation of this and guarantee it is a SharedArrayBuffer
    return this.state.buffer as SharedArrayBuffer;
  }

  public get buffersAvailable(): boolean {
    return this.state[STATE.BUFFERS_AVAILABLE] === TRUE;
  }

  public get bufferWriteHead(): number {
    return this.state[STATE.BUFFER_WRITE_HEAD];
  }

  public set bufferWriteHead(value: number) {
    this.state[STATE.BUFFER_WRITE_HEAD] = value;
  }

  public get fullBufferLength(): number {
    return this.state[STATE.FULL_BUFFER_LENGTH];
  }

  private set fullBufferLength(value: number) {
    this.state[STATE.FULL_BUFFER_LENGTH] = value;
  }

  public get finishedProcessing(): boolean {
    return this.state[STATE.FINISHED_PROCESSING] === TRUE;
  }

  /**
   * called by the processor when it has finished writing to the buffer
   */
  public bufferReady(): void {
    Atomics.store(this.state, STATE.BUFFERS_AVAILABLE, TRUE);
  }

  public bufferProcessing(): boolean {
    return Atomics.load(this.state, STATE.BUFFERS_AVAILABLE) === TRUE;
  }

  /** called by the worker when it has finished processing the buffer
   *  this will also move any remaining samples to the start of the buffer
   *  and reset the buffer write head
   */
  public bufferProcessed(sampleBuffer: Float32Array): void {
    if (this.bufferWriteHead >= this.fullBufferLength) {
      sampleBuffer.copyWithin(0, this.fullBufferLength, this.bufferWriteHead);
      this.bufferWriteHead -= this.fullBufferLength;
    } else {
      this.bufferWriteHead = 0;
    }
    Atomics.store(this.state, STATE.BUFFERS_AVAILABLE, FALSE);
  }

  public finished(): void {
    Atomics.store(this.state, STATE.FINISHED_PROCESSING, TRUE);
  }

  public isFinished(): boolean {
    return Atomics.load(this.state, STATE.FINISHED_PROCESSING) === TRUE;
  }

  /**
   * Create a new SharedArrayBuffer that backs the state object.
   * @param fullBufferLength The number of samples after which the worker will be activated.
   */
  public static createState(fullBufferLength: number): State {
    // TODO: There's probably a better way than using Object.key() here
    const buffer = new SharedArrayBuffer(Object.keys(STATE).length * Int32Array.BYTES_PER_ELEMENT);

    // because we are manually allocating memory, the buffer will initially be filled with random data
    // to avoid this, we can fill the buffer with zeros
    const castedBuffer = new Int32Array(buffer).fill(0);
    const state = new State(castedBuffer);

    state.fullBufferLength = fullBufferLength;

    return state;
  }
}

export class ProcessorState extends State {
  public spinWaitForWorker() {
    // Atomics.wait(this.states, STATE.BUFFERS_AVAILABLE, 1);
    // we have to do this because Chrome doesn't support Atomics.wait inside of
    // AudioProcessorWorklet's (Firefox does)
    while (this.bufferProcessing()) {
      // do nothing
      // TODO: can we do something here other than burn cycles?
    }
  }
}

export class WorkerState extends State {
  public waitForFullBuffer() {
    return Atomics.wait(this.state, STATE.BUFFERS_AVAILABLE, 0);
  }
}
