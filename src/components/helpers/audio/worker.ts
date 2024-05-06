import webfft from "webfft";
import { WebfftWrapper } from "../../../types/webfft";
import {
  getAudioInformation,
  getSharedBuffer,
  getSharedCanvas,
  getSharedWorkerState,
  getSpectrogramOptions,
  IAudioInformation,
  SharedBuffersWithCanvas,
  SpectrogramOptions,
  WorkerState,
} from "./state";
import { smooth } from "./window";
import { ColorScaler, getColorScale } from "./colors";
import { Profiler } from "../debug/profiler";
import { construct } from "./mel";

// this worker is concerned with rendering an audio buffer
// let spectrogramPaintX = 0;

/**
 * Render process
 * 1. Receive a full sample buffer from the processor
 * 2. Window through the sample buffer
 * 3. Apply a window function to smooth the signal to each window
 * 4. Perform a FFT on the windowed signal
 * 5. Apply transforms to the FFT output (magnitude, amplitude, decibels, mel scale, etc)
 * 6. Paint the output to the spectrogram canvas (colors, brightness, contrast, etc)
 * 7. Paint the spectrogram canvas to the destination canvas (and stretch it to fit the destination canvas)
 *
 */

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

let options: SpectrogramOptions;
let fft: WebfftWrapper;
let state: WorkerState;
let imageBuffer: Uint8ClampedArray;

/** contains samples accumulated by the processor */
let sampleBuffer: Float32Array;

let lastFrameIndex = 0;

// TODO: scope these
let fftHeight: number;
let fftWidth: number;
let colorScale: ColorScaler;
let melScale: (fft: Float32Array) => Float32Array;

let audioInformation: IAudioInformation;
let fftCache: Float32Array;

const sampleProfiler = new Profiler("sample");
const fftRealProfiler = new Profiler("fft real");
const fftComplexProfiler = new Profiler("fft complex");
const magnitudeProfiler = new Profiler("magnitude");
const scaledProfiler = new Profiler("scaled");
const melProfiler = new Profiler("mel");
const decibelsProfiler = new Profiler("decibels");
const normalizedIntensityProfiler = new Profiler("normalized intensity");

const bytesPerPixel = 4 as const;

function calculateMagnitude(complexData: Float32Array): Float32Array {
  const half = complexData.length / 2;
  const newData = new Float32Array(half);

  for (let i = 0; i < half; i++) {
    const sourceIndex = i * 2;

    const real = complexData[sourceIndex];
    const complex = complexData[sourceIndex + 1];

    fftRealProfiler.addSample(real);
    fftComplexProfiler.addSample(complex);

    newData[i] = Math.sqrt(real * real + complex * complex);

    magnitudeProfiler.addSample(newData[i]);
  }

  return newData;
}

function calculateDecibels(magnitudeBuffer: Float32Array): Float32Array {
  for (let i = 0; i < magnitudeBuffer.length; i++) {
    // because we square the amplitude in the magnitude function, we indirectly have power
    // therefore, we use the power relationship to convert to decibels
    magnitudeBuffer[i] = 20 * Math.log10(magnitudeBuffer[i]);
    decibelsProfiler.addSample(magnitudeBuffer[i]);
  }

  return magnitudeBuffer;
}

function scaleValues(magnitudeBuffer: Float32Array, scale: number): Float32Array {
  const maxMagnitude = magnitudeBuffer.reduce((a, b) => Math.max(a, b), 0);
  for (let i = 0; i < magnitudeBuffer.length; i++) {
    // normalize the magnitude by the window size
    // https://dsp.stackexchange.com/a/63006
    // https://stackoverflow.com/a/20170717/224512

    magnitudeBuffer[i] = (magnitudeBuffer[i] / maxMagnitude) * scale;
    scaledProfiler.addSample(magnitudeBuffer[i]);
  }

  return magnitudeBuffer;
}

function max(samples: Float32Array): number {
  let max = 0;
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.abs(samples[i]);
    if (sample > max) {
      max = sample;
    }
  }

  return max;
}

function kernel(): void {
  console.count("kernel");

  // RGBA, alpha hard coded to 255. Re use one pixel buffer for efficiency
  const pixel = new Uint8ClampedArray(4);
  pixel[3] = 255;

  // temporarily call fft lots, and do our own windowing and overlaps
  // for each frame
  const size = options.windowSize;
  const step = options.windowSize - options.windowOverlap;

  const cacheOffset = lastFrameIndex;

  // frame is the index of the column of pixel we are painting
  let frame = 0;
  const lastSampleIndex = state.bufferWriteHead;

  for (let sampleIndex = 0; sampleIndex < lastSampleIndex; sampleIndex += step) {
    // copy-less slice
    const window = sampleBuffer.subarray(sampleIndex, sampleIndex + size);

    // if the window buffer is partially full, we want to fill the rest with zeros
    if (lastSampleIndex < state.fullBufferLength) {
      window.fill(0, lastSampleIndex, size);
    }

    sampleProfiler.addSamples(Array.from(window));

    const maxAmplitude = max(window);

    // apply a window function to smooth the signal
    const smoothed = smooth(window, options.windowFunction);

    // returns real (magnitude) and complex (phase) parts
    //@ts-expect-error the FFT library doesn't ship its types and is not available on definitely typed
    const out = fft.fftr(smoothed);

    // TODO: collapse the following post transform functions into a single function

    // collapse real and complex parts into magnitude
    const magnitude = calculateMagnitude(out);

    // convert to amplitude
    let scaled = scaleValues(magnitude, maxAmplitude);

    // might want to do a mel scale conversion here (check that this is correct)

    // convert to mel scale (optional based on settings)
    if (options.melScale) {
      scaled = melScale(scaled);
      melProfiler.addSamples(Array.from(scaled));
      console.log("mel scale length", scaled.length, "expected", options.windowSize / 2);
    } else {
      // noop
    }
    // convert to decibels
    scaled = calculateDecibels(scaled);

    // cache the fft results so that we don't have to re-calculate it every time
    // fftCache.set(decibels, cacheOffset);

    for (let frequencyBin = 0; frequencyBin < scaled.length; frequencyBin++) {
      const value = scaled[frequencyBin];

      const minDecibels = -120;
      const maxDecibels = 0;
      const range = maxDecibels - minDecibels;

      // TODO: this range expression is probably incorrect
      let intensity = (value - minDecibels) / range;

      // brightness and contrast
      intensity += options.brightness;
      intensity *= options.contrast;

      // clamp
      intensity = Math.min(1, Math.max(0, intensity));

      normalizedIntensityProfiler.addSample(intensity);

      const rgbColor = colorScale(intensity);
      pixel.set(rgbColor);

      const x = frame + lastFrameIndex;
      const y = frequencyBin;
      const offset = bytesPerPixel * (x + y * fftWidth);
      if (offset > imageBuffer.length - 4) {
        console.log("overflow coordinates", x, y, offset, imageBuffer.length);
      }
      imageBuffer.set(pixel, offset);
    }

    frame++;
  }

  lastFrameIndex += frame;

  // print out all the profilers
  console.table([
    sampleProfiler.calculate(),
    fftRealProfiler.calculate(),
    fftComplexProfiler.calculate(),
    magnitudeProfiler.calculate(),
    scaledProfiler.calculate(),
    melProfiler.calculate(),
    decibelsProfiler.calculate(),
    normalizedIntensityProfiler.calculate(),
  ]);

  state.bufferProcessed(sampleBuffer);
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

  // let the processor know we are done with the buffer and it can continue
  // accumulating more samples
  renderImageBuffer(imageBuffer);

  fft.dispose();
}

function renderImageBuffer(buffer: Uint8ClampedArray): void {
  const imageData = new ImageData(buffer, fftWidth, fftHeight);

  // paint buffer to the spectrogram canvas
  spectrogramSurface.putImageData(imageData, 0, 0);

  // paint the spectrogram canvas to the destination canvas
  // and stretch to fill
  destinationSurface.drawImage(spectrogramCanvas, 0, 0, destinationCanvas.width, destinationCanvas.height);

  // commit doesn't exist on chrome!
  destinationSurface.commit && destinationSurface.commit();
}

// runs when the processor is first created
// should only be run once and only to share buffers and canvas
function handleMessage(event: MessageEvent<SharedBuffersWithCanvas>) {
  state = getSharedWorkerState(event.data);
  sampleBuffer = getSharedBuffer(event.data);
  options = getSpectrogramOptions(event.data);
  audioInformation = getAudioInformation(event.data);
  destinationCanvas = getSharedCanvas(event.data);

  const totalSamples = audioInformation.endSample - audioInformation.startSample;
  const frameCount = Math.ceil(totalSamples / (options.windowSize - options.windowOverlap));

  colorScale = getColorScale(options.colorMap);
  const something = 256;
  if (options.melScale) {
    melScale = construct(
      {
        fftSize: options.windowSize / 2,
        bankCount: something,
        lowFrequency: 0,
        highFrequency: audioInformation.sampleRate / 2,
        sampleRate: audioInformation.sampleRate,
      },
      something,
    );
  }

  fftWidth = frameCount;
  fftHeight = options.melScale ? something : options.windowSize / 2;

  // raw fft values
  fftCache = new Float32Array(fftWidth * fftHeight);

  // is fft with color and transforms applied to it
  imageBuffer = new Uint8ClampedArray(fftHeight * fftWidth * bytesPerPixel);

  spectrogramCanvas = new OffscreenCanvas(fftWidth, fftHeight);
  spectrogramSurface = spectrogramCanvas.getContext("2d")!;

  destinationSurface = destinationCanvas.getContext("2d")!;

  // I have moved the fft initialization here after micro benchmarking
  // if you move this to the processing kernel, it will be very slow on Chrome (not firefox)
  // This is because chrome re-compiles the WASM module every time it's initialized
  // while Firefox will cache the WASM module compilation
  fft = new webfft(options.windowSize);

  work();
}

onmessage = handleMessage;
