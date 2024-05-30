import { BUFFER_PROCESSOR_NAME, ProcessorMessage } from "./messages";
import { ProcessorState } from "./state";

/**
 * Runs once and only once to add samples to a buffer.
 * A new processor is needed for each render.
 * We keep a track of the generation to ensure the processor discards
 * samples from multiple concurrent processors invoking process.
 */
export default class BufferBuilderProcessor extends AudioWorkletProcessor {
  private state!: ProcessorState;
  private buffer!: Float32Array;
  private aborted = false;
  private generation = 0;
  private tag = "processor:";

  public constructor() {
    super();

    this.port.onmessage = this.handleMessage.bind(this);
  }

  /**
   * @param inputs - is an array of inputs, each having an array of channels, with an array of samples
   */

  public process(inputs: Float32Array[][]) {
    if (this.aborted) {
      //console.log(this.tag, "Processor aborted");
      return false;
    }

    // we should always have single input with one single channel of data by this point
    // any mixing or channel selection should be done before this processor
    const input = inputs[0][0];
    let writeHead = this.state.bufferWriteHead;
    const bufferLength = this.buffer.length;

    let newHead = writeHead + input.length;

    // 3 cases
    // 1. filling buffer
    // 2. filling buffer wholly
    // 3. filling buffer and overflowing

    // since we support partial consumption of buffers the easiest way to deal
    // with an overflow is to just run the worker to empty the buffer
    if (newHead >= bufferLength) {
      // signal worker to process the sample buffer
      //console.log(this.tag, "buffer ready", newHead, bufferLength);
      this.state.bufferReady();

      // wait for the worker to finish processing the buffer
      this.state.busyWaitForWorkerToProcessBuffer();

      // update write head - it is often non-zero
      writeHead = this.state.bufferWriteHead;
      newHead = writeHead + input.length;
    }

    // we may need to check for aborts more frequently
    if (this.needsToAbort()) {
      return false;
    }

    this.buffer.set(input, writeHead);
    this.state.bufferWriteHead = newHead;

    return true;
  }

  private needsToAbort(): boolean {
    if (this.state.matchesCurrentGeneration(this.generation)) {
      return false;
    } else {
      this.aborted = true;
      //console.log(this.tag, "Processor aborted", this.generation, this.state.generation);
      return true;
    }
  }

  // runs when the processor is first created
  // should only be run once and only to share buffers
  private handleMessage(event: ProcessorMessage) {
    if (event.data[0] === "setup") {
      const data = event.data[1];
      const generation = data.generation;

      this.state = new ProcessorState(data.state);
      this.buffer = new Float32Array(data.sampleBuffer);
      this.generation = generation;
      this.tag = `processor (${generation}):`;

      // signal back that we're ready
      //console.log(this.tag, "Processor ready");
      const valid = this.state.processorReady(generation);
      if (!valid) {
        console.error(this.tag, "Processor not valid, aborting");
        this.aborted = true;
      }
    } else {
      throw new Error("Unknown message type");
    }
  }
}

registerProcessor(BUFFER_PROCESSOR_NAME, BufferBuilderProcessor);
