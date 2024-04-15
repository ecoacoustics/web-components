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
    message: 'BUFFER_WORKER_READY',
    SharedBuffers: SharedBuffers,
  });
}

onmessage = (event) => {
  if (event.data.message === "INITIALIZE_WORKER") {
    initialize(event.data.options);
  }
};
