import { SharedBuffers, MESSAGE_PROCESSOR_READY, ProcessorState, ProcessorMessages, NamedMessageEvent } from "./state";

export default class BufferBuilderProcessor extends AudioWorkletProcessor {
  public constructor() {
    super();

    this.port.onmessage = this.handleMessage.bind(this);
  }

  private state!: ProcessorState;
  private buffer!: Float32Array;
  private aborted = false;

  /**
   * @param inputs - is an array of inputs, each having an array of channels, with an array of samples
   */

  public process(inputs: Float32Array[][]) {
    if (this.checkAborted()) {
      return false;
    }

    // we should always have single input with one single channel of data by this point
    // any mixing or channel selection should be done before this processor
    const input = inputs[0][0];
    let writeHead = this.state.bufferWriteHead;
    const bufferLength = this.state.fullBufferLength;

    let newHead = writeHead + input.length;

    // 3 cases
    // 1. filling buffer
    // 2. filling buffer wholly
    // 3. filling buffer and overflowing

    // since we support partial consumption of buffers the easiest way to deal
    // with an overflow is to just run the worker to empty the buffer
    if (newHead >= bufferLength) {
      // signal worker to process the sample buffer
      console.log("buffer ready", newHead, bufferLength);
      this.state.bufferReady();

      // wait for the worker to finish processing the buffer
      this.state.spinWaitForWorker();

      if (this.checkAborted()) {
        return false;
      }

      console.log("buffer ready 2", newHead, bufferLength);

      // update write head - it is often non-zero
      writeHead = this.state.bufferWriteHead;
      newHead = writeHead + input.length;
    }

    this.buffer.set(input, writeHead);
    this.state.bufferWriteHead = newHead;

    return true;
  }

  private checkAborted(): boolean {
    if (this.aborted) {
      throw new Error("Processor aborted");
    }

    if (this.state.abortingOrAborted) {
      this.aborted = true;
      console.log("Processor aborted", this.aborted);
      return true;
    }

    return false;
  }

  // runs when the processor is first created
  // should only be run once and only to share buffers
  private handleMessage(event: NamedMessageEvent<ProcessorMessages, any>) {
    if (event.data[0] === "setup") {
      const data = event.data[1] as SharedBuffers;

      this.state = new ProcessorState(data.state);
      this.buffer = new Float32Array(data.sampleBuffer);

      // console.log("processor setup");

      // signal back that we're ready
      this.port.postMessage(MESSAGE_PROCESSOR_READY);
    } else {
      throw new Error("Unknown message type");
    }
  }
}

registerProcessor("buffer-builder-processor", BufferBuilderProcessor);
