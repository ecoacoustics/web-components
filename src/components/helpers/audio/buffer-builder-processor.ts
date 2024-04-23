// this processor worklet is concerned with building a linked list buffer of audio buffer nodes

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

class BufferBuilderProcessor extends AudioWorkletProcessor {
  public constructor() {
    super();

    this.port.onmessage = this.handleMessage.bind(this);
  }

  private sharedBuffers!: ISharedBuffers;

  public process(inputs: Float32Array[][], outputs: Float32Array[][]) {
    const input = new Float32Array(inputs[0][0]);

    let currentBufferLength = new Int32Array(this.sharedBuffers.states)[STATE.BUFFER_LENGTH];

    const sharedBuffer = new Float32Array(this.sharedBuffers.buffer);

    sharedBuffer.set(input, currentBufferLength * 128);

    // console.log(currentBufferLength);
    // console.log("input", Array.from(input));
    // console.log("shared", Array.from(sharedBuffer));

    // TODO: fix this hacky solution
    new Int32Array(this.sharedBuffers.states)[STATE.BUFFER_LENGTH] = ++currentBufferLength;

    const fullBufferLength = new Int32Array(this.sharedBuffers.states)[STATE.FULL_BUFFER_LENGTH];

    // if the buffer is full, we need to wait for the buffer to be consumed
    if (currentBufferLength >= fullBufferLength) {
      new Int32Array(this.sharedBuffers.states)[STATE.BUFFERS_AVAILABLE] = 1;

      while (new Int32Array(this.sharedBuffers.states)[STATE.BUFFERS_AVAILABLE] === 1) {
        // wait
      }

      new Float32Array(this.sharedBuffers.buffer).fill(0);

      // rest the linked list header to 0 (start overwriting the linked list again)
      new Int32Array(this.sharedBuffers.states)[STATE.BUFFER_LENGTH] = 0;
    }

    // simply reflect the input to the output
    // because it is done by reference, we should disable warning where we don't do anything with it
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    outputs = inputs;
    return true;
  }

  private handleMessage(event: MessageEvent<ISharedBuffers>) {
    this.sharedBuffers = event.data;

    // initial state
    new Int32Array(this.sharedBuffers.states)[STATE.BUFFERS_AVAILABLE] = 0;
    new Int32Array(this.sharedBuffers.states)[STATE.BUFFER_LENGTH] = 0;
    new Int32Array(this.sharedBuffers.states)[STATE.FULL_BUFFER_LENGTH] = 4;

    this.port.postMessage("ready");
  }
}

registerProcessor("buffer-builder-processor", BufferBuilderProcessor);
