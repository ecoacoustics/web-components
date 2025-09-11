import { SpectrogramGenerator } from "./spectrogram";
import { SharedBuffersWithCanvas, WorkerMessage, GenerationMetadata } from "./messages";
import { WorkerState } from "./state";
import { Size } from "../../models/rendering";
import { SpectrogramOptions } from "../../components/spectrogram/spectrogramOptions";
import { AudioInformation } from "./audioInformation";

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

let audioInformation: AudioInformation;

function paintBuffer(generation: number): void {
  //console.log(`worker (${generation}):work:`, state.bufferWriteHead);

  const consumed = spectrogram.partialGenerate(
    sampleBuffer,
    state.bufferWriteHead,
    state.isProcessorComplete(generation),
  );

  state.bufferProcessed(sampleBuffer, consumed);
}

/**
 * main loop, only called once after we have received the shared buffers
 * @param generation - the render generation
 */
function work(generation: number): void {
  const tag = `worker (${generation}):`;
  const timerTag = `${tag} render`;
  console.time(timerTag);

  state.workerBusy();

  let aborted = false;
  while (state.processorCanGenerate(generation)) {
    // wait for a buffer
    if (!state.waitForBuffer()) {
      // if buffer is not ready, it is either a
      if (state.matchesCurrentGeneration(generation)) {
        // timeout
        //console.log(tag, "timeout");
        continue;
      } else {
        // or an abort
        //console.log(tag, "abort");
        aborted = true;
        break;
      }
    }

    paintBuffer(generation);
  }

  //console.log(tag, "remaining samples?", state.bufferWriteHead);

  // actually paint the spectrogram to the canvas
  if (!aborted) {
    // In the optimal case, the buffer write head is zero at the end of an audio stream
    // if not, we render what ever else is left
    if (state.bufferWriteHead > 0) {
      paintBuffer(generation);
    }

    renderImageBuffer(spectrogram.outputBuffer, generation);
  }

  console.timeEnd(timerTag);

  state.workerReady();
}

function renderImageBuffer(buffer: Uint8ClampedArray, generation: number): void {
  const imageData = new ImageData(buffer as any, spectrogram.width, spectrogram.height);

  // paint buffer to the spectrogram canvas at  a 1:1 scale
  spectrogramSurface.putImageData(imageData, 0, 0);

  drawSpectrogramOntoDestinationCanvas(generation);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function drawSpectrogramOntoDestinationCanvas(_generation: number): void {
  // paint the spectrogram canvas to the destination canvas and stretch to fill

  //? AT: I actually don't like the look of this solution. During high frequency
  //? changes you don't actually see the spectrogram being updated.
  //? The alternative is that during high frequency changes you may see the
  //? a partial spectrogram being updated but it will update more frequently
  // ? and it never lands/finishes on a partial update.
  // with one last check that we're still in the current generation
  // if (!state.matchesCurrentGeneration(generation)) {
  //   return;
  // }
  destinationSurface.drawImage(spectrogramCanvas, 0, 0, destinationCanvas.width, destinationCanvas.height);

  // commit doesn't exist on chrome
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  destinationSurface.commit && destinationSurface.commit();
}

function setup(data: SharedBuffersWithCanvas): void {
  //console.log("worker:setup:", data);
  state = new WorkerState(data.state);
  sampleBuffer = new Float32Array(data.sampleBuffer);
  destinationCanvas = data.canvas;

  // just use a default size - regenerate will resize it in a second
  spectrogramCanvas = new OffscreenCanvas(512, 512);
  spectrogramSurface = spectrogramCanvas.getContext("2d") as OffscreenCanvasRenderingContext2D;

  destinationSurface = destinationCanvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
  destinationSurface.imageSmoothingEnabled = true;
  destinationSurface.imageSmoothingQuality = "high";

  state.workerReady();
}

function regenerate(data: GenerationMetadata): void {
  ({ options, audioInformation } = data);

  spectrogram = new SpectrogramGenerator(audioInformation, options);

  // console.log(
  //   `worker (${data.generation}): regenerate`,
  //   {
  //     samples: spectrogram.totalSamples,
  //     naturalWidth: spectrogram.width,
  //     naturalHeight: spectrogram.height,
  //     windowSize: spectrogram.size,
  //     windowStep: spectrogram.step,
  //   },
  //   options,
  // );

  spectrogramCanvas.width = spectrogram.width;
  spectrogramCanvas.height = spectrogram.height;

  work(data.generation);
}

function clearCanvas(): void {
  destinationSurface.clearRect(0, 0, destinationCanvas.width, destinationCanvas.height);
}

function resizeCanvas(data: Size): void {
  destinationCanvas.width = data.width;
  destinationCanvas.height = data.height;

  // redraw the spectrogram from the 1:1 spectrogram canvas
  // onto the destination
  drawSpectrogramOntoDestinationCanvas(state.generation);
  //console.log("resized canvas", data);
}

// runs when the processor is first created
// should only be run once and only to share buffers and canvas
function handleMessage(event: WorkerMessage) {
  const eventMessage = event.data[0];

  switch (eventMessage) {
    case "setup":
      setup(event.data[1]);
      break;
    case "resize-canvas":
      resizeCanvas(event.data[1]);
      break;
    case "regenerate-spectrogram":
      regenerate(event.data[1]);
      break;
    case "clear-canvas":
      clearCanvas();
      break;
    default:
      throw new Error("unknown message: " + event.data[0]);
  }
}

onmessage = handleMessage;
