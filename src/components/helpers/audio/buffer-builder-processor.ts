import { getSharedBuffer, SharedBuffers, MESSAGE_PROCESSOR_READY, getSharedProcessorState, ProcessorState } from "./state";

export default class BufferBuilderProcessor extends AudioWorkletProcessor {
  public constructor() {
    super();

    this.port.onmessage = this.handleMessage.bind(this);
  }

  private state!: ProcessorState;
  private buffer!: Float32Array;

  /**
   * @param inputs - is an array of inputs, each having an array of channels, with an array of samples
   */

  public process(inputs: Float32Array[][]) {
    // we should always have single input with one single channel of data by this point
    // any mixing or channel selection should be done before this processor
    const input = inputs[0][0];
    const offset = this.state.bufferWriteHead;

    this.buffer.set(input, offset);

    this.state.bufferWriteHead = offset + input.length;

    // if the buffer is full, we need to wait for the buffer to be consumed
    if (this.state.bufferWriteHead >= this.state.fullBufferLength) {
      // signal worker to process the sample buffer
      this.state.bufferReady();

      // wait for the worker to finish processing the buffer
      this.state.spinWaitForWorker();
    }

    return true;
  }

  // runs when the processor is first created
  // should only be run once and only to share buffers
  private handleMessage(event: MessageEvent<SharedBuffers>) {
    this.state = getSharedProcessorState(event.data);
    this.buffer = getSharedBuffer(event.data);

    // signal back that we're ready
    this.port.postMessage(MESSAGE_PROCESSOR_READY);
  }
}

registerProcessor("buffer-builder-processor", BufferBuilderProcessor);
