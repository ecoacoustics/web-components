import { WindowFunctionName } from "fft-windowing-ts";
import { Hertz, Sample } from "models/unitConverters";

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

export type NamedMessageData<TMessage, TData> = [name: TMessage, data: TData];
export type NamedMessageEvent<TMessage, TData> = MessageEvent<NamedMessageData<TMessage, TData>>;

export type SharedBuffers = { state: SharedArrayBuffer; sampleBuffer: SharedArrayBuffer };
export type ProcessorMessages = "setup";
export type WorkerMessages = "setup" | "resize-canvas" | "regenerate-spectrogram";

export type SharedBuffersWithCanvas = SharedBuffers & {
  canvas: OffscreenCanvas;
  spectrogramOptions: SpectrogramOptions;
  audioInformation: IAudioInformation;
};

export const MESSAGE_PROCESSOR_READY = "processor-ready";

type ColorMap = any;

export interface IAudioInformation {
  startSample: Sample;
  endSample: Sample;
  sampleRate: Hertz;
}

export class SpectrogramOptions {
  constructor(
    windowSize: number,
    windowOverlap: number,
    windowFunction: WindowFunctionName,
    melScale: boolean,
    brightness: number,
    contrast: number,
    colorMap: ColorMap,
  ) {
    this.windowSize = windowSize;
    this.windowOverlap = windowOverlap;
    this.windowFunction = windowFunction;
    this.melScale = melScale;
    this.brightness = brightness;
    this.contrast = contrast;
    this.colorMap = colorMap;
  }

  /**
   * number of samples in each window for the fft
   * must be a power of 2
   */
  public windowSize: number;
  /** number of samples to overlap between windows */
  public windowOverlap: number;
  public windowFunction: WindowFunctionName;
  public melScale: boolean;
  public brightness: number;
  public contrast: number;
  public colorMap: ColorMap;

  public get windowStep(): number {
    return this.windowSize - this.windowOverlap;
  }
}

const TRUE = 1 as const;
const FALSE = 0 as const;
export class State {
  constructor(state: SharedArrayBuffer) {
    this.state = new Int32Array(state);
  }

  public state: Int32Array;

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

  public bufferProcessing(): boolean {
    return Atomics.load(this.state, STATE.BUFFERS_AVAILABLE) === TRUE;
  }

  /** Called by the worker when it has finished processing the buffer.
   *  This will reset the buffer write head.
   *  If any samples weren't consumed, they will be copied to the beginning of the buffer.
   */
  public bufferProcessed(sampleBuffer: Float32Array, consumed: number): void {
    if (consumed < this.bufferWriteHead) {
      const remainingSamples = this.bufferWriteHead - consumed;
      sampleBuffer.copyWithin(0, consumed, this.bufferWriteHead);
      //console.log("state: partial buffer processed", remainingSamples, consumed, this.bufferWriteHead);
      this.bufferWriteHead = remainingSamples;
    } else {
      this.bufferWriteHead = 0;
    }
    Atomics.store(this.state, STATE.BUFFERS_AVAILABLE, FALSE);
  }

  public finished(): void {
    Atomics.store(this.state, STATE.FINISHED_PROCESSING, TRUE);
    //console.log("state: finished");
    Atomics.store(this.state, STATE.BUFFERS_AVAILABLE, TRUE);
    Atomics.notify(this.state, STATE.BUFFERS_AVAILABLE, TRUE);
  }

  public resetWork(): void {
    this.bufferWriteHead = 0;
    Atomics.store(this.state, STATE.FINISHED_PROCESSING, FALSE);
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
    // enum's have two way key-value pairs (eg. key -> value and value -> key)
    // and we only want the key -> value pair, we divide the object key length by two
    const buffer = new SharedArrayBuffer((Object.keys(STATE).length / 2) * Int32Array.BYTES_PER_ELEMENT);

    const state = new State(buffer);

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

  /**
   * called by the processor when it has finished writing to the buffer
   */
  public bufferReady(): void {
    //console.log("state: buffer ready");
    Atomics.store(this.state, STATE.BUFFERS_AVAILABLE, TRUE);
    Atomics.notify(this.state, STATE.BUFFERS_AVAILABLE, TRUE);
  }
}

export class WorkerState extends State {
  public waitForBuffer() {
    Atomics.wait(this.state, STATE.BUFFERS_AVAILABLE, FALSE);
  }
}
