class FftProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs, outputs, parameters) {
    const result = new SharedArrayBuffer(256);

    worker.postMessage(result);
    return true;
  }
}

registerProcessor("fft-processor", FftProcessor);
