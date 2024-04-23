import webfft from "webfft";

interface IWorkerSharedBuffers {
  buffer: SharedArrayBuffer;
  states: SharedArrayBuffer;
  canvas: OffscreenCanvas;
}

// this worker is concerned with rendering an audio buffer nodes from the linked list buffer
let sharedBuffers: IWorkerSharedBuffers;
let spectrogramPaintX = 1;
let ctxWorker: OffscreenCanvasRenderingContext2D | null = null;
let canvas = null;

// a kernel operation is a function which can be applied to full buffer
function kernel(): void {
  const bufferToProcess = new Float32Array(sharedBuffers.buffer);

  if (!ctxWorker) return;

  const fft = new webfft(bufferToProcess.length / 2);

  const out = fft.fft(bufferToProcess) as Float32Array;

  out.forEach((value, i) => {
    const x = spectrogramPaintX;
    const y = i;

    const color = Math.abs(Math.floor(value * 255));

    if (!ctxWorker) return;

    ctxWorker.fillStyle = `rgb(${color}, ${color}, ${color})`;
    ctxWorker.fillRect(x, y, 1, 1);
  });

  spectrogramPaintX++;

  fft.dispose();
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

function handleMessage(event: MessageEvent<IWorkerSharedBuffers>) {
  sharedBuffers = event.data;

  canvas = event.data.canvas;
  ctxWorker = canvas.getContext("2d");

  waitForFullBuffer();
}

onmessage = (event) => {
  handleMessage(event);
};
