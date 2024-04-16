import { ISharedBuffers } from "./buffer-builder-processor";

// this worker is concerned with rendering an audio buffer nodes from the linked list buffer
let sharedBuffers: any;

// a kernel operation is a function which can be applied to full buffer
function kernel(): void {
  const bufferToProcess = buffer();

  self.postMessage({ fftData: bufferToProcess });

  releaseProcessor();
}

function waitForFullBuffer(): void {
  while (new Int32Array(sharedBuffers.states)[3] !== 1) {
    if (new Int32Array(sharedBuffers.states)[0] === 1) {
      kernel();
    }
  }
}

// if the buffer is full, the processor will wait until it is released
function releaseProcessor(): void {
  new Int32Array(sharedBuffers.states)[0] = 0;
}

function buffer(): Float32Array {
  return new Float32Array(sharedBuffers.buffer);
}

function handleMessage(event: MessageEvent<ISharedBuffers>) {
  sharedBuffers = event.data;

  waitForFullBuffer();
}

onmessage = (event) => {
  handleMessage(event);
};
