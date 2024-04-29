import { ISharedBuffers, STATE } from "./state";

class BufferBuilderProcessor extends AudioWorkletProcessor {
  public constructor() {
    super();

    this.port.onmessage = this.handleMessage.bind(this);
  }

  private fullBufferLength!: number;
  private states!: Int32Array;
  private buffer!: Float32Array;

  public process(inputs: Float32Array[][]) {
    const input = inputs[0][0];
    const offset = this.states[STATE.BUFFER_LENGTH] * input.length;

    this.buffer.set(input, offset);
    this.states[STATE.BUFFER_LENGTH]++;

    // if the buffer is full, we need to wait for the buffer to be consumed
    if (this.states[STATE.BUFFER_LENGTH] >= this.fullBufferLength) {
      Atomics.store(this.states, STATE.BUFFERS_AVAILABLE, 1);

      // Atomics.wait(this.states, STATE.BUFFERS_AVAILABLE, 1);
      // we have to do this because Chrome doesn't support Atomics.wait inside of
      // AudioProcessorWorklet's (Firefox does)
      while (Atomics.load(this.states, STATE.BUFFERS_AVAILABLE) === 1) {
        // do nothing
      }

      this.states[STATE.BUFFER_LENGTH] = 0;
    }

    return true;
  }

  private handleMessage(event: MessageEvent<ISharedBuffers>) {
    this.states = new Int32Array(event.data.states);
    this.buffer = new Float32Array(event.data.buffer);
    this.fullBufferLength = new Int32Array(event.data.states)[STATE.FULL_BUFFER_LENGTH];

    this.port.postMessage("ready");
  }
}

registerProcessor("buffer-builder-processor", BufferBuilderProcessor);
