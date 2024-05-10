import {
  IAudioInformation,
  NamedMessageEvent,
  SharedBuffersWithCanvas,
  SpectrogramOptions,
  WorkerMessages,
  WorkerState,
} from "./state";
import { SpectrogramGenerator } from "./spectrogram";
import { Size } from "models/rendering";

/** the canvas from the main thread */
let destinationCanvas!: OffscreenCanvas;
/** the surface for the main thread canvas */
let destinationSurface!: OffscreenCanvasRenderingContext2D;
/**
 * a canvas for the spectrogram, a 1:1 representation of the 2D FFT painted with colors
 * Its size should be the complete 2d fft for the render window
 *
 * e.g. If the render window is 1.5 -> 9.5 seconds
 *      Then the spectrogram canvas should be 7 seconds long
 *      Which should be approximately 43 * 7 (301) pixels wide
 *      (given a window size of 512 and an overlap of 0 and a sample rate of 22050 Hz)
 */
let spectrogramCanvas!: OffscreenCanvas;
/** the surface for the spectrogram canvas */
let spectrogramSurface!: OffscreenCanvasRenderingContext2D;
let spectrogram: SpectrogramGenerator;

let options: SpectrogramOptions;

let state: WorkerState;

/** contains samples accumulated by the processor */
let sampleBuffer: Float32Array;

let audioInformation: IAudioInformation;

// TODO: add a fft cache

function kernel(): void {
  console.count("kernel");

  const consumed = spectrogram.partialGenerate(sampleBuffer, state.bufferWriteHead, state.finishedProcessing);

  state.bufferProcessed(sampleBuffer, consumed);

  // console.log("wrote n frames, write head", state.bufferWriteHead);
}

// main loop, only called once after we have received the shared buffers
function work(): void {
  while (!state.isFinished()) {
    state.waitForBuffer();

    console.log("work", state.bufferWriteHead);
    // In the optimal case, the buffer write head is zero at the end of an audio stream
    // if not, we render what ever else is left
    if (state.bufferWriteHead >= 0) {
      kernel();
    }
  }

  // actually paint the spectrogram to the canvas
  renderImageBuffer(spectrogram.outputBuffer);

  spectrogram.dispose();
}

function renderImageBuffer(buffer: Uint8ClampedArray): void {
  const imageData = new ImageData(buffer, spectrogram.width, spectrogram.height);

  // paint buffer to the spectrogram canvas at  a 1:1 scale
  spectrogramSurface.putImageData(imageData, 0, 0);

  drawSpectrogramOntoDestinationCanvas();
}

function drawSpectrogramOntoDestinationCanvas(): void {
  // paint the spectrogram canvas to the destination canvas and stretch to fill
  destinationSurface.drawImage(spectrogramCanvas, 0, 0, destinationCanvas.width, destinationCanvas.height);

  // commit doesn't exist on chrome!
  destinationSurface.commit && destinationSurface.commit();
}

function setup(data: SharedBuffersWithCanvas): void {
  ({ spectrogramOptions: options, audioInformation, canvas: destinationCanvas } = data);

  state = new WorkerState(data.state);
  sampleBuffer = new Float32Array(data.sampleBuffer);

  console.log(options);

  spectrogram = new SpectrogramGenerator(audioInformation, options);

  console.log("spectrogram worker:", {
    samples: spectrogram.totalSamples,
    bufferLength: state.fullBufferLength,
    naturalWidth: spectrogram.width,
    naturalHeight: spectrogram.height,
    windowSize: spectrogram.size,
    windowStep: spectrogram.step,
  });

  spectrogramCanvas = new OffscreenCanvas(spectrogram.width, spectrogram.height);
  spectrogramSurface = spectrogramCanvas.getContext("2d")!;

  destinationSurface = destinationCanvas.getContext("2d")!;
  destinationSurface.imageSmoothingEnabled = true;
  destinationSurface.imageSmoothingQuality = "high";

  // start polling
  work();
}

function regenerate(options: SpectrogramOptions): void {
  state.resetWork();
  spectrogram = new SpectrogramGenerator(audioInformation, options);

  work();
}

function resizeCanvas(data: Size): void {
  destinationCanvas.width = data.width;
  destinationCanvas.height = data.height;

  // redraw the spectrogram from the 1:1 spectrogram canvas
  // onto the destination
  drawSpectrogramOntoDestinationCanvas();
  //console.log("resized canvas", data);
}

// runs when the processor is first created
// should only be run once and only to share buffers and canvas
function handleMessage(event: NamedMessageEvent<WorkerMessages, any>) {
  const eventMessage = event.data[0];

  switch (eventMessage) {
    case "setup":
      setup(event.data[1] as SharedBuffersWithCanvas);
      break;
    case "resize-canvas":
      resizeCanvas(event.data[1] as Size);
      break;
    case "regenerate-spectrogram":
      regenerate(event.data[1] as SpectrogramOptions);
      break;
    default:
      throw new Error("unknown message: " + event.data[0]);
  }
}

onmessage = handleMessage;
