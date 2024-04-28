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

function kernel(): void {
  const out = fft.fft(buffer);

  let y = 0;
  out.forEach((value: number, i: number) => {
    if (i < out.length / 2) {
      const color = Math.abs(Math.floor(value * 255));

      ctxWorker!.fillStyle = `rgb(${color}, ${color}, ${color})`;
      ctxWorker!.fillRect(spectrogramPaintX, y, 1, 1);

      y++;
    }
  });

  spectrogramPaintX++;

  releaseProcessor();
}

function waitForFullBuffer(): void {
  while (!state[STATE.FINISHED_PROCESSING]) {
    Atomics.wait(state, STATE.BUFFERS_AVAILABLE, 0);
    kernel();
  }

  fft.dispose();
}

function releaseProcessor(): void {
  // Atomics.notify(state, STATE.BUFFERS_AVAILABLE, 1);
  Atomics.add(state, STATE.BUFFERS_AVAILABLE, 1);
}

function handleMessage(event: MessageEvent<IWorkerSharedBuffers>) {
  state = new Int32Array(event.data.states);
  buffer = new Float32Array(event.data.buffer);
  canvas = event.data.canvas;
  ctxWorker = canvas.getContext("2d");

  // I have moved the fft initialization here after extensive micro benchmarking
  // if you move this to the processing kernel, it will be very slow on Chrome (not firefox)
  // This is because chrome re-compiles the WASM module every time it's initialized
  // while Firefox will cache the WASM module compilation
  fft = new webfft(256);

  waitForFullBuffer();
}

onmessage = handleMessage;
