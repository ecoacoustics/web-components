import * as FFT from "fft.js";

// TODO: This should probably be imported from shared-buffer-worker.js
const STATE = {
  REQUEST_RENDER: 0,
  IB_FRAMES_AVAILABLE: 1,
  IB_READ_INDEX: 2,
  IB_WRITE_INDEX: 3,
  OB_FRAMES_AVAILABLE: 4,
  OB_READ_INDEX: 5,
  OB_WRITE_INDEX: 6,
  RING_BUFFER_LENGTH: 7,
  KERNEL_LENGTH: 8,
};

class SharedBufferWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // port messages should always come from the shared buffer worker
    // eg. The shared buffers are full and you should process them now
    this.port.onmessage = this.handlePortMessage.bind(this);
  }

  private initialized = false;
  private states!: Int32Array;

  // IO ring buffers
  private inputRingBuffer!: Float32Array[];
  private outputRingBuffer!: Float32Array[];
  private ringBufferLength!: number;
  private kernelLength!: number;

  // called from AudioWorkletProcessor
  public process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: AudioParamMap) {
    if (!this.initialized) {
      return false;
    }

    const inputChannelData = inputs[0][0];
    const outputChannelData = outputs[0];

    this.inputChannelData(inputChannelData);
    this.outputChannelData(outputChannelData);

   
    if (this.states[STATE.IB_FRAMES_AVAILABLE] >= this.kernelLength) {
      const kernelInput = this.inputRingBuffer[0].subarray(this.states[STATE.IB_READ_INDEX], this.kernelLength);

      const f = new FFT(this.kernelLength);

      const out = f.createComplexArray();
      f.realTransform(out, kernelInput);

      const fftData = this.oneDFftToTwoD(out);

      outputs[0].forEach((channel) => {
        for (let i = 0; i < channel.length; i++) {
          channel[i] = fftData[i][0];
        }
      });

      return true;
    }

    const kernelInput = this.inputRingBuffer[0].subarray(this.states[STATE.IB_READ_INDEX], this.kernelLength);

    const f = new FFT(this.kernelLength);

    const out = f.createComplexArray();
    f.realTransform(out, kernelInput);

    const fftData = this.oneDFftToTwoD(out);

    outputs[0].forEach((channel) => {
      for (let i = 0; i < channel.length; i++) {
        channel[i] = fftData[i][0];
      }
    });

    return false;
  }

  private oneDFftToTwoD(fftData: any[]): Float32Array[] {
    const rowSize = 128;
    const columnSize = 128;

    const twoDArray: any[] = [];
    for (let i = 0; i < rowSize; i++) {
      const row = new Float32Array(columnSize);
      for (let j = 0; j < columnSize; j++) {
        row[j] = fftData[i * columnSize + j];
      }
      twoDArray.push(row);
    }

    return twoDArray;
  }

  private handlePortMessage(event: MessageEvent) {
    const sharedBuffers = event.data;
    this.states = new Int32Array(sharedBuffers.states);

    this.inputRingBuffer = [new Float32Array(sharedBuffers.inputRingBuffer)];
    this.outputRingBuffer = [new Float32Array(sharedBuffers.outputRingBuffer)];

    this.ringBufferLength = this.states[STATE.RING_BUFFER_LENGTH];
    this.kernelLength = this.states[STATE.KERNEL_LENGTH];

    this.initialized = true;
  }

  private inputChannelData(inputChannelData: Float32Array) {
    const inputWriteIndex = this.states[STATE.IB_WRITE_INDEX];

    if (inputWriteIndex + inputChannelData.length < this.ringBufferLength) {
      // If the ring buffer has enough space to push the input.
      this.inputRingBuffer[0].set(inputChannelData, inputWriteIndex);
      this.states[STATE.IB_WRITE_INDEX] += inputChannelData.length;
    } else {
      // When the ring buffer does not have enough space so the index needs to
      // be wrapped around.
      const splitIndex = this.ringBufferLength - inputWriteIndex;
      const firstHalf = inputChannelData.subarray(0, splitIndex);
      const secondHalf = inputChannelData.subarray(splitIndex);
      this.inputRingBuffer[0].set(firstHalf, inputWriteIndex);
      this.inputRingBuffer[0].set(secondHalf);
      this.states[STATE.IB_WRITE_INDEX] = secondHalf.length;
    }

    // Update the number of available frames in the input ring buffer.
    this.states[STATE.IB_FRAMES_AVAILABLE] += inputChannelData.length;
  }

  private outputChannelData(outputChannelData: Float32Array[]) {
    const outputReadIndex = this.states[STATE.OB_READ_INDEX];
    const nextReadIndex = outputReadIndex + outputChannelData.length;

    if (nextReadIndex < this.ringBufferLength) {
      outputChannelData[0].set(this.outputRingBuffer[0].subarray(outputReadIndex, nextReadIndex));
      this.states[STATE.OB_READ_INDEX] += outputChannelData.length;
    } else {
      const overflow = nextReadIndex - this.ringBufferLength;
      const firstHalf = this.outputRingBuffer[0].subarray(outputReadIndex);
      const secondHalf = this.outputRingBuffer[0].subarray(0, overflow);
      outputChannelData[0].set(firstHalf);
      outputChannelData[0].set(secondHalf, firstHalf.length);
      this.states[STATE.OB_READ_INDEX] = secondHalf.length;
    }
  }
}

registerProcessor("fft-processor", SharedBufferWorkletProcessor);
