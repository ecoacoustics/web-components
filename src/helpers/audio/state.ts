import { sleep } from "../utilities";

/**
 * There are names for indexes in a packed struct stored in a SharedArrayBuffer
 *
 * @example
 * ```ts
 * const stateBuffer = new SharedArrayBuffer(4 * Int32Array.BYTES_PER_ELEMENT);
 * const states = new Int32Array(stateBuffer);
 * ```
 *
 * A state is a packed struct with the following layout:
 * @example
 * ```ts
 * [
 *     STATE.BUFFER_AVAILABLE,
 *     STATE.BUFFER_WRITE_HEAD,
 *     STATE.PROCESSOR_STATE,
 *     STATE.WORKER_STATE,
 *     STATE.GENERATION,
 * ]
 * ```
 */
enum STATE {
  // if the shared buffer is full, and available to be processed
  // BUFFER_AVAILABLE will be set to 1 (true)
  // This should cause the canvas worker to process the buffer and create an fft
  //* Type: BUFFER_READY_STATES
  BUFFER_AVAILABLE = 0,

  // this is the index where the last sample has been written to in the buffer
  // this can be used by the processor to determine where to write next
  // it is also used by the worker to determine where to stop reading from the buffer
  //* Type: Int32
  BUFFER_WRITE_HEAD = 1,

  // The state of the worker.
  // Mainly used so the main thread knows when the worker is idle.
  //* Type: WORKER_STATES
  WORKER_STATE = 2,

  // The worker and the main thread are reused for each render cycle.
  // However, the processor always needs to be recreated for each render cycle.
  // This allows us create multiple processors that are assigned to a particular
  // render cycle - their generation. If the generation counter changes, the processor
  // should no longer write samples to the buffer - this is effectively an abort signal.
  //* Type: Int32
  GENERATION = 3,

  // The generation of the most recently ready processor.
  // Initial value is -1, which means no processor is ready.
  //* Type: Int32
  PROCESSOR_READY = 4,

  // The generation of the most recently completed processor.
  // This is used to determine if the processor has finished writing to the buffer.
  // Initial value is -1, which means no processor has completed.
  //* Type: Int32
  PROCESSOR_COMPLETE = 5,
}

enum BUFFER_READY_STATES {
  NOT_READY = 0,
  READY = 1,
}

enum WORKER_STATES {
  NEW = 0,
  IDLE = 1,
  PROCESSING = 2,
}

export class State {
  /**
   * Create a new SharedArrayBuffer that backs the state object.
   * @param fullBufferLength The number of samples after which the worker will be activated.
   */
  public static createState(): State {
    // enum's have two way key-value pairs (eg. key -> value and value -> key)
    // and we only want the key -> value pair, we divide the object key length by two
    const buffer = new SharedArrayBuffer((Object.keys(STATE).length / 2) * Int32Array.BYTES_PER_ELEMENT);

    const state = new State(buffer);

    // initialize the state
    state.processorReadyGeneration = -1;
    state.processorCompleteGeneration = -1;

    return state;
  }

  public constructor(state: SharedArrayBuffer) {
    this.state = new Int32Array(state);
  }

  protected readonly state: Int32Array;

  /**
   * Export the storage buffer for the state as a SharedArrayBuffer.
   */
  public get stateBuffer(): SharedArrayBuffer {
    // we control creation of this and guarantee it is a SharedArrayBuffer
    return this.state.buffer as SharedArrayBuffer;
  }

  public get bufferAvailable(): boolean {
    return Atomics.load(this.state, STATE.BUFFER_AVAILABLE) === BUFFER_READY_STATES.READY;
  }

  /**
   * Notifies!
   */
  protected set bufferAvailable(value: BUFFER_READY_STATES) {
    Atomics.store(this.state, STATE.BUFFER_AVAILABLE, value);
    Atomics.notify(this.state, STATE.BUFFER_AVAILABLE, value);
  }

  public get bufferWriteHead(): number {
    return Atomics.load(this.state, STATE.BUFFER_WRITE_HEAD);
  }

  public set bufferWriteHead(value: number) {
    Atomics.store(this.state, STATE.BUFFER_WRITE_HEAD, value);
  }

  public get workerNew(): boolean {
    return Atomics.load(this.state, STATE.WORKER_STATE) === WORKER_STATES.NEW;
  }

  public get workerIdle(): boolean {
    return Atomics.load(this.state, STATE.WORKER_STATE) === WORKER_STATES.IDLE;
  }

  public get workerProcessing(): boolean {
    return Atomics.load(this.state, STATE.WORKER_STATE) === WORKER_STATES.PROCESSING;
  }

  protected set workerProcessing(value: WORKER_STATES) {
    Atomics.store(this.state, STATE.WORKER_STATE, value);
    Atomics.notify(this.state, STATE.WORKER_STATE, value);
  }

  public get generation(): number {
    return Atomics.load(this.state, STATE.GENERATION);
  }

  public get processorReadyGeneration(): number {
    return Atomics.load(this.state, STATE.PROCESSOR_READY);
  }

  protected set processorReadyGeneration(value: number) {
    Atomics.store(this.state, STATE.PROCESSOR_READY, value);
  }

  public get processorCompleteGeneration(): number {
    return Atomics.load(this.state, STATE.PROCESSOR_COMPLETE);
  }

  private set processorCompleteGeneration(value: number) {
    Atomics.store(this.state, STATE.PROCESSOR_COMPLETE, value);
  }

  public isProcessorReady(generation: number): boolean {
    return Atomics.load(this.state, STATE.PROCESSOR_READY) === generation;
  }

  public isProcessorComplete(generation: number): boolean {
    return Atomics.load(this.state, STATE.PROCESSOR_COMPLETE) === generation;
  }

  /**
   * Called by the main thread when the processor has finished writing to the buffer.
   * The processor has no more samples to write. We trigger the buffer available state
   * to signal the worker to process the buffer.
   */
  public processorComplete(generation: number): void {
    // replace the value with the new generation
    // only if it is greater than the current generation.
    // We don't use compareExchange because if we're out of sync we still want
    // to advance the generation, otherwise we'll be in a deadlock.
    const current = this.processorCompleteGeneration;
    if (generation > current) {
      this.processorCompleteGeneration = generation;
    }

    // A valid call should increment the generation by 1.
    // Any other case is a signal to abort.
    //console.log("state: processor complete", generation, current, this.processorCompleteGeneration);
    if (generation === current + 1) {
      this.bufferAvailable = BUFFER_READY_STATES.READY;
    }
  }

  /**
   * Called by the main thread when options have changed.
   * The generation is incremented.
   * The old processor should be discarded.
   * The worker should be updated.
   * @returns The new generation.
   */
  public reset(): number {
    // this will abort the current processor
    const old = Atomics.add(this.state, STATE.GENERATION, 1);
    const nextGeneration = old + 1;

    // this will notify
    this.bufferWriteHead = 0;
    this.bufferAvailable = BUFFER_READY_STATES.NOT_READY;
    //console.log("state: reset", nextGeneration);
    return nextGeneration;
  }

  public matchesCurrentGeneration(generation: number): boolean {
    return Atomics.load(this.state, STATE.GENERATION) === generation;
  }

  /**
   * Called by the main thread when it is waiting for the processor to be ready.
   */
  public async waitForProcessorReady(generation: number) {
    // waitAsync not supported in FF, wait not allowed on main thread

    while (this.processorReadyGeneration < generation) {
      // do nothing but still yield
      await sleep(0);
    }

    //console.warn("state: processor ready", generation, this.generation, this.processorReadyGeneration);

    return this.matchesCurrentGeneration(generation);
  }

  /**
   * Called by the main thread when it is waiting for the processor to be ready.
   */
  public async waitForWorkerReady() {
    // waitAsync not supported in FF, wait not allowed on main thread
    while (this.workerNew) {
      // do nothing
      await sleep(0);
    }
  }

  public async waitForWorkerIdle() {
    // waitAsync not supported in FF, wait not allowed on main thread
    while (!this.workerIdle) {
      // do nothing
      await sleep(0);
    }
  }
}

export class ProcessorState extends State {
  /**
   * Called by the processor thread when it is ready to start processing.
   * This will signal the main thread to start rendering.
   * @param generation - The generation of the processor.
   * @returns true if the ready call is valid, false if the processor should abort.
   */
  public processorReady(generation: number): boolean {
    // replace the value with the new generation
    // only if it is greater than the current generation.
    // We don't use compareExchange because if we're out of sync we still want
    // to advance the generation, otherwise we'll be in a deadlock.
    const current = this.processorReadyGeneration;
    if (generation > current) {
      this.processorReadyGeneration = generation;
    }

    // A valid call should increment the generation by 1.
    // Any other case is a signal to abort.
    return generation === current + 1;
  }

  public busyWaitForWorkerToProcessBuffer() {
    // we have to do this because Chrome doesn't support Atomics.wait inside of
    // AudioProcessorWorklet's (Firefox does)
    while (this.bufferAvailable) {
      // do nothing
      // TODO: can we do something here other than burn cycles?
    }
  }

  /**
   * called by the processor when it has finished writing to the buffer
   */
  public bufferReady(): void {
    this.bufferAvailable = BUFFER_READY_STATES.READY;
  }
}

/**
 * Represents the state of a worker.
 */
export class WorkerState extends State {
  TIMEOUT = 1;

  public processorCanGenerate(generation: number): boolean {
    return this.isProcessorReady(generation) && !this.isProcessorComplete(generation);
  }

  /**
   * Waits for the buffer to become available.
   *
   * This method can exit in the following scenarios:
   * - When the value is still the same as the expected value.
   * - When the value is different from the expected value.
   * - After the timeout period.
   *
   * In our first design we chose to never exit unless the value has changed.
   * However, long waits like that don't give us the opportunity to check for aborts.
   *
   * The tradeoff however, there is no guarantee that BUFFER_AVAILABLE is true when we exit.
   * @returns true if the buffer is available, false if the buffer is not available.
   */
  public waitForBuffer(): boolean {
    return (
      // wait until ready (but can also return if notified or timed out)
      Atomics.wait(this.state, STATE.BUFFER_AVAILABLE, BUFFER_READY_STATES.NOT_READY, this.TIMEOUT) === "not-equal"
    );
  }

  /**
   * Called by the worker when it has finished processing the buffer.
   * This will reset the buffer write head.
   * If any samples weren't consumed, they will be copied to the beginning of the buffer.
   *
   * @param sampleBuffer - The buffer containing the samples.
   * @param consumed - The number of samples consumed by the worker.
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

    this.bufferAvailable = BUFFER_READY_STATES.NOT_READY;
  }

  /**
   * Called by the worker when it is processing the buffer.
   */
  public workerBusy(): void {
    this.workerProcessing = WORKER_STATES.PROCESSING;
  }

  /**
   * Called by the worker when it is idle.
   */
  public workerReady(): void {
    this.workerProcessing = WORKER_STATES.IDLE;
  }
}
