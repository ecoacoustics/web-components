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

let States;
let InputRingBuffer;
let OutputRingBuffer;

function processKernel() {
  inputReadIndex = States[STATE.IB_READ_INDEX];
  outputWriteIndex = States[STATE.OB_WRITE_INDEX];

  if (isNaN(InputRingBuffer[0][inputReadIndex])) {
    console.error("Found NaN at buffer index: %d", inputReadIndex);
  }

  // const f = new FFT(3072);

  // const out = f.createComplexArray();
  // f.realTransform(out, InputRingBuffer[0]);

  for (let i = 0; i < 1024; ++i) {
    OutputRingBuffer[0][outputWriteIndex] = InputRingBuffer[0][inputReadIndex];

    if (++outputWriteIndex === 3072) {
      outputWriteIndex = 0;
    }
    if (++inputReadIndex === 3072) {
      inputReadIndex = 0;
    }
  }

  States[STATE.IB_READ_INDEX] = inputReadIndex;
  States[STATE.OB_WRITE_INDEX] = outputWriteIndex;
}

function initialize() {
  const ringBufferLength = 3072;
  const channelCount = 1;
  const bytesPerSample = Float32Array.BYTES_PER_ELEMENT;
  const bytesPerState = Int32Array.BYTES_PER_ELEMENT;
  const stateBufferLength = 16;
  const kernelLength = 1024;

  const SharedBuffers = {
    states: new SharedArrayBuffer(stateBufferLength * bytesPerState),
    inputRingBuffer: new SharedArrayBuffer(ringBufferLength * channelCount * bytesPerSample),
    outputRingBuffer: new SharedArrayBuffer(ringBufferLength * channelCount * bytesPerSample),
  };

  States = new Int32Array(SharedBuffers.states);
  InputRingBuffer = [new Float32Array(SharedBuffers.inputRingBuffer)];
  OutputRingBuffer = [new Float32Array(SharedBuffers.outputRingBuffer)];

  Atomics.store(States, STATE.RING_BUFFER_LENGTH, ringBufferLength);
  Atomics.store(States, STATE.KERNEL_LENGTH, kernelLength);

  postMessage({
    message: "BUFFER_WORKER_READY",
    SharedBuffers: SharedBuffers,
  });

  waitOnRenderRequest();
}

function waitOnRenderRequest() {
  // As long as |REQUEST_RENDER| is zero, keep waiting. (sleep)
  while (Atomics.wait(States, STATE.REQUEST_RENDER, 0) === "ok") {
    processKernel();

    // Update the number of available frames in the buffer.
    States[STATE.IB_FRAMES_AVAILABLE] -= 1024;
    States[STATE.OB_FRAMES_AVAILABLE] += 1024;

    // Reset the request render bit, and wait again.
    Atomics.store(States, STATE.REQUEST_RENDER, 0);
  }
}

onmessage = (event) => {
  if (event.data.message === "INITIALIZE_WORKER") {
    initialize(event.data.options);
  }
};
