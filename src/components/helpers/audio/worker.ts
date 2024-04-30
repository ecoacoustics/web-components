import webfft from "webfft";
import { WebfftWrapper } from "../../../types/webfft";
import {
  getSharedBuffer,
  getSharedCanvas,
  getSharedWorkerState,
  getSpectrogramOptions,
  SharedBuffersWithCanvas,
  SpectrogramOptions,
  WorkerState,
} from "./state";

// this worker is concerned with rendering an audio buffer
let spectrogramPaintX = 1;
let surface!: OffscreenCanvasRenderingContext2D;
let canvas!: OffscreenCanvas;
let options: SpectrogramOptions;
let fft: WebfftWrapper;
let state: WorkerState;
let buffer: Float32Array;
let imageBuffer: Uint8ClampedArray;

let height: number;
let width: number;
let bytesPerPixel: number;

function kernel(): void {
  // temporarily call fft lots, and do our own windowing and overlaps
  // for each frame
  length = options.windowSize;

  let window;
  for (let i = 0; i < state.fullBufferLength; i += length) {
    window = buffer.slice(i, i + length);

    const out = fft.fft(window);

    for (let j = 0; j < out.length; j++) {
      const value = out[j];

      // TODO: Remove this, I am currently just painting a minimum of grey pixels so that we
      // can see where the render function gets up to
      const intensity = Math.abs(value * 200) + 55;
      const alpha = 255;

      const pxValue = [intensity, intensity, intensity, alpha];

      imageBuffer.set(pxValue, j * bytesPerPixel + out.length * spectrogramPaintX);
    }

    spectrogramPaintX++;
  }

  state.bufferProcessed(window as Float32Array);
}

// main loop, only called once after we have received the shared buffers
function work(): void {
  while (!state.isFinished()) {
    state.waitForFullBuffer();
    kernel();
  }

  renderSpectrogram();
  fft.dispose();
}

function renderSpectrogram(): void {
  imageBuffer.set([255, 0, 0, 1], imageBuffer.length - 4);
  console.log(imageBuffer);
  const imageData = new ImageData(imageBuffer, imageBuffer.length / height, height);
  surface.putImageData(imageData, 0, 0);
  surface.drawImage(canvas, 0, 0, canvas.width, canvas.height);
}

// runs when the processor is first created
// should only be run once and only to share buffers and canvas
function handleMessage(event: MessageEvent<SharedBuffersWithCanvas>) {
  state = getSharedWorkerState(event.data);
  buffer = getSharedBuffer(event.data);

  canvas = getSharedCanvas(event.data);
  surface = canvas.getContext("2d")!;

  options = getSpectrogramOptions(event.data);

  height = options.windowSize / 2;
  width = state.fullBufferLength / (options.windowSize - options.windowOverlap);
  bytesPerPixel = 4;
  imageBuffer = new Uint8ClampedArray(height * width * bytesPerPixel);

  // I have moved the fft initialization here after micro benchmarking
  // if you move this to the processing kernel, it will be very slow on Chrome (not firefox)
  // This is because chrome re-compiles the WASM module every time it's initialized
  // while Firefox will cache the WASM module compilation
  // TODO: pass in other relevant options here
  fft = new webfft(options.windowSize);

  work();
}

onmessage = handleMessage;
