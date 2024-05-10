/** helper functions for generating spectrograms */

import webfft from "webfft";
import { ColorScaler, getColorScale } from "./colors";
import { constructMfcc } from "./mel";
import { IAudioInformation, SpectrogramOptions } from "./state";
import { resolveSmoother, SmoothingFunction } from "./window";

const bytesPerPixel = 4 as const;

/**
 * A class to generate a spectrogram from an sample buffer.
 * The output is a Uint8ClampedArray that can be painted into a canvas.
 * This is a big messy, stateful, side-effecty class that is designed to
 * reduce allocations and improve performance.
 *
 */
export class SpectrogramGenerator {
  private audio: IAudioInformation;
  private options: SpectrogramOptions;

  private fft: webfft;

  // the spectrogram always "covers" some window of samples from the audio
  // file. This is the total number of samples in that window.
  // e.g. a window of 1.5 to 9.5 seconds at 22050 Hz would be 154350 samples long.
  #totalSamples: number;

  // for the given options and totalSamples, this is the natural width and height of the spectrogram
  private fftWidth: number;
  private fftHeight: number;

  private smooth: SmoothingFunction;
  private colorScale: ColorScaler;
  private melScale: null | ((fft: Float32Array) => Float32Array) = null;

  /** This is the last column of spectrum we converted into pixels */
  private lastFrameIndex = 0;

  private imageBuffer: Uint8ClampedArray;

  // reuse for efficiency - trying to reduce allocations as much as possible
  private complexInput: Float32Array;
  private window: Float32Array;
  private spectrum: Float32Array;

  constructor(audio: IAudioInformation, options: SpectrogramOptions) {
    this.audio = audio;
    this.options = options;

    this.lastFrameIndex = 0;
    this.fft = new webfft(options.windowSize);

    this.#totalSamples = audio.endSample - audio.startSample;
    const frameCount = Math.ceil(this.totalSamples / this.step);
    const binCount = options.windowSize / 2;

    this.colorScale = getColorScale(options.colorMap);
    this.smooth = resolveSmoother(options.windowFunction);

    if (options.melScale) {
      this.melScale = constructMfcc({
        fftSize: binCount,
        bankCount: binCount,
        lowFrequency: 0,
        highFrequency: this.nyquist,
        sampleRate: audio.sampleRate,
      });
    }

    this.fftWidth = frameCount;
    this.fftHeight = binCount;

    this.imageBuffer = new Uint8ClampedArray(this.fftWidth * this.fftHeight * bytesPerPixel);

    this.complexInput = new Float32Array(this.size * 2);
    this.window = new Float32Array(this.size);
    this.spectrum = new Float32Array(this.size / 2);
  }

  public get nyquist(): number {
    return this.audio.sampleRate / 2;
  }

  public get step(): number {
    return this.options.windowSize - this.options.windowOverlap;
  }

  public get size(): number {
    return this.options.windowSize;
  }

  public get outputBuffer(): Uint8ClampedArray {
    return this.imageBuffer;
  }

  public get width(): number {
    return this.fftWidth;
  }

  public get height(): number {
    return this.fftHeight;
  }

  public get totalSamples(): number {
    return this.#totalSamples;
  }

  public dispose() {
    this.fft.dispose();
  }

  /**
   * Generate a 2D spectrogram from the audio samples.
   * Assumes a progressive rendering scenario where the audio samples are
   * continuously fed into the spectrogram.
   * If it can't fill a window with samples, it will wait partially consume the current buffer with the assumption
   * the next buffer will include the unconsumed samples.
   * To indicate the end of the audio stream supply `consumeAll = true` to consume all samples in the buffer.
   * @param samples The audio samples to generate the spectrogram from.
   * @param lastSampleIndex The index of the last sample in the input buffer.
   *  The buffer may have more samples than this but they should be considered uninitialized memory.
   * @param consumeAll If true, the function will consume all samples in the buffer.
   * @returns The number of samples consumed from the input buffer.
   */
  public partialGenerate(samples: Float32Array, lastSampleIndex: number, consumeAll: boolean): number {
    // step through the samples in the buffer - we may not consume all samples
    let sampleIndex = 0;
    for (sampleIndex = 0; sampleIndex < lastSampleIndex; sampleIndex += this.step) {
      // 1. extract a window of samples into `this.window`
      if (!this.extractWindow(samples, sampleIndex, lastSampleIndex, this.size, consumeAll)) {
        // if we're not finishing, we'll just break out of the loop here, wait for the next buffer
        // and then continue processing in the next kernel
        //console.log("break early, read trailing samples in next kernel");
        break;
      }

      // 2. extract maximum so we can normalize the signal after the fft
      const maxAmplitude = this.max(this.window);

      // 3. apply a window function to smooth the signal
      this.smooth(this.window);

      // 4. Do the fft
      // the source library is poorly documented but the input is
      // a Float32Array of interleaved real and complex parts
      // this.window -> this.complexInput
      this.interleaveReals();
      const out = this.fft.fft(this.complexInput);

      // 5. for positive frequencies, collapse real and complex parts into magnitude
      // (writes into the spectrum array)
      // out -> this.spectrum
      const maxMagnitude = this.extractMagnitude(out);

      // 6. convert to amplitude
      this.rescaleValues(maxMagnitude, maxAmplitude);

      // 7. convert to mel scale (optional based on settings)
      if (this.melScale) {
        const melSpectrum = this.melScale(this.spectrum);

        // TODO: remove this copy ideally
        this.spectrum.set(melSpectrum);
      }

      // 8. convert to decibels, colorize and write the spectrum to the image buffer
      this.paintSpectrumIntoPixelBuffer();

      this.lastFrameIndex++;
    }

    return sampleIndex;
  }

  private extractWindow(samples: Float32Array, start: number, limit: number, size: number, pad: boolean) {
    const endSampleIndex = start + size;
    if (endSampleIndex <= limit) {
      // default case, we can consume a full window without overflowing
      this.window.set(samples.subarray(start, endSampleIndex));
    } else {
      if (!pad) {
        return false;
      }
      // but if we are finishing, there are no more samples
      // edge case, we are near the end of the buffer, so backtrack to fill the window
      this.window.set(samples.subarray(limit - size, limit));
    }

    return true;
  }

  private max(samples: Float32Array): number {
    let max = 0;
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.abs(samples[i]);
      if (sample > max) {
        max = sample;
      }
    }

    return max;
  }

  private interleaveReals() {
    const source = this.window;
    const destination = this.complexInput;
    for (let i = 0; i < source.length; i++) {
      destination[i * 2] = source[i];
      // don't need to set the complex part to zero because it's already zero
      //destination[i * 2 + 1] = 0;
    }
  }

  /**
   * We keep only the positive frequencies and discard the dc offset and negative frequencies
   * @param fftOutput The output of the fft.
   * @param spectrum The array to store the magnitude of the fft.
   * @param windowSize
   * @returns The maximum magnitude of the fft.
   */
  private extractMagnitude(fftOutput: Float32Array): number {
    const spectrum = this.spectrum;
    const half = spectrum.length;

    // record the maximum value for scaling purposes
    let max = 0;

    // fft structure: [ dc offset, ...positive frequencies, the nyquist bin, ...negative frequencies]
    // Where all values are interleaved real and complex components.
    // now choose either the positive frequencies (and discard the negative frequencies which have identical information)
    // we start at index 2 because the first two values are the dc offset, and we end
    // at size + 2 because the last value is the nyquist bin which is shared between positive and negative frequencies
    const skipDc = 2;
    for (let i = 0; i < half; i++) {
      const sourceIndex = skipDc + i * 2;

      const real = fftOutput[sourceIndex];
      const complex = fftOutput[sourceIndex + 1];

      // we have half of the energy in the positive frequencies and half in the negative frequencies
      // so we need to double the components to get the full energy
      const magnitude = Math.sqrt(real * real + complex * complex) * 2;
      spectrum[i] = magnitude;

      if (magnitude > max) {
        max = magnitude;
      }
    }

    return max;
  }

  private rescaleValues(magnitudeMax: number, amplitudeMax: number) {
    const spectrum = this.spectrum;
    for (let i = 0; i < spectrum.length; i++) {
      // various sources note that dividing by the window size is the correct way to scale
      // but this doesn't work well when a window is applied to the data because it's hard
      // to know how the window affects the energy envelope of the signal
      // //rescaled = spectrum[i] / options.windowSize;
      //
      // Instead:
      // 1. we normalize each frame by it's maximum to make the spectrum unit values
      let rescaled = spectrum[i] / magnitudeMax;

      // 2. Then scale it down so that the maximum intensity of the spectrum is equivalent to the maximum amplitude of the input signal.
      rescaled = rescaled * amplitudeMax;

      spectrum[i] = rescaled;
    }
  }

  private paintSpectrumIntoPixelBuffer() {
    for (let frequencyBin = 0; frequencyBin < this.spectrum.length; frequencyBin++) {
      const value = this.spectrum[frequencyBin];
      // because we square the amplitude in the magnitude function, we indirectly have power
      // therefore, we use the power relationship to convert to decibels
      const decibels = 20 * Math.log10(value);

      const minDecibels = -120;
      const maxDecibels = 0;
      const range = maxDecibels - minDecibels;

      let intensity = (decibels - minDecibels) / range;

      // brightness and contrast
      intensity += this.options.brightness;
      intensity *= this.options.contrast;

      // clamp
      intensity = Math.min(1, Math.max(0, intensity));

      const rgbColor = this.colorScale(intensity);

      const x = this.lastFrameIndex;
      // inverted y-axis
      const y = this.fftHeight - 1 - frequencyBin;
      const offset = bytesPerPixel * (x + y * this.fftWidth);
      if (offset > this.imageBuffer.length - 4) {
        console.log("overflow coordinates", x, y, offset, this.imageBuffer.length);
      }
      this.imageBuffer.set(rgbColor, offset);
      // opacity
      this.imageBuffer[offset + 3] = 255;
    }
  }
}
