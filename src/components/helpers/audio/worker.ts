import webfft from "webfft";
import { WebfftWrapper } from "../../../types/webfft";
import { IWorkerSharedBuffers, STATE } from "./state";

// this worker is concerned with rendering an audio buffer nodes from the linked list buffer
let spectrogramPaintX = 1;
let ctxWorker: OffscreenCanvasRenderingContext2D | null = null;
let canvas: OffscreenCanvas | null = null;
let fft: WebfftWrapper;
let state: Int32Array;
let buffer: Float32Array;
let imageBuffer: Uint8ClampedArray;
let imageHeight = 0;

function kernel(): void {
  const out = fft.fft(buffer);

  out.forEach((value, index) => {
    const intensity = Math.abs(value * 200) + 55;
    imageBuffer.set([intensity, intensity, intensity, 255], index * 4 + (128 * spectrogramPaintX));
  });

  imageHeight = out.length;

  spectrogramPaintX++;

  releaseProcessor();
}

function waitForFullBuffer(): void {
  while (!state[STATE.FINISHED_PROCESSING]) {
    Atomics.wait(state, STATE.BUFFERS_AVAILABLE, 0);
    kernel();
  }

  renderSpectrogram();
  fft.dispose();
}

function renderSpectrogram(): void {
  if (!ctxWorker || !canvas) return;

  const imageWidth = spectrogramPaintX;

  const image = new ImageData(imageBuffer, imageWidth, imageHeight);
  ctxWorker.putImageData(image, 0, 0);
  ctxWorker.drawImage(canvas, 0, 0, imageWidth, imageHeight, 0, 0, 300, 300);
}

function releaseProcessor(): void {
  // Atomics.notify(state, STATE.BUFFERS_AVAILABLE, 1);
  buffer.fill(0);
  Atomics.add(state, STATE.BUFFERS_AVAILABLE, 1);
}

function handleMessage(event: MessageEvent<IWorkerSharedBuffers>) {
  state = new Int32Array(event.data.states);
  buffer = new Float32Array(event.data.buffer);

  imageBuffer = new Uint8ClampedArray(220 * state[STATE.FULL_BUFFER_LENGTH] * 128 * 4);
  imageBuffer.fill(0);

  canvas = event.data.canvas;
  ctxWorker = canvas.getContext("2d");

  // I have moved the fft initialization here after extensive micro benchmarking
  // if you move this to the processing kernel, it will be very slow on Chrome (not firefox)
  // This is because chrome re-compiles the WASM module every time it's initialized
  // while Firefox will cache the WASM module compilation
  fft = new webfft(64 * state[STATE.BUFFER_LENGTH]);

  waitForFullBuffer();
}

onmessage = handleMessage;
