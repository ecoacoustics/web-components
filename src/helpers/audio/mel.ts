// Sourced from
// https://github.com/Waxo/sound-parameters-extractor/blob/067a334e699713da227bdb2fc9d25f9de80dcdfd/src/mfcc.js
// under the MIT license.

type BankFilter = (freqPowers: Float32Array) => Float32Array;

interface MelConfig {
  fftSize: number;
  bankCount: number;
  lowFrequency: number;
  highFrequency: number;
  sampleRate: number;
}

interface MelFilterBank {
  filters: Array<Array<number>>;
  lowMel: number;
  highMel: number;
  deltaMel: number;
  lowFreq: number;
  highFreq: number;
  filter: BankFilter;
}

/**
 * Converts from Mel-scale to hertz. Used by constructFilterBank.
 * @param mels - mels to convert to hertz
 */
export function melsToHz(mels: number) {
  return 700 * (Math.exp(mels / 1127) - 1);
}

/**
 * Converts from hertz to the Mel-scale. Used by constructFilterBank.
 * @param hertz - hertz to convert to mels
 */
export function hertzToMels(hertz: number) {
  return 1127 * Math.log(1 + hertz / 700);
}

/**
 * Creates a filter bank with config.bankCount triangular filters.
 * Filters are distributed according to the mel scale.
 *
 * @param config - Object containing the config for mfccBank
 * (eg: config = {  fftSize: 32,  bankCount: 24,  lowFrequency: 1,
 *   highFrequency: 8000,  sampleRate: 16000,})
 */
export function constructMelFilterBank(config: MelConfig): MelFilterBank {
  const bins = [];
  const fq = [];
  const filters: Array<Array<number>> = [];

  const lowMel = hertzToMels(config.lowFrequency);
  const highMel = hertzToMels(config.highFrequency);
  const deltaMel = (highMel - lowMel) / (config.bankCount + 1);

  for (let i = 0; i < config.bankCount; i++) {
    fq[i] = melsToHz(lowMel + i * deltaMel);
    bins[i] = Math.floor(((config.fftSize + 1) * fq[i]) / (config.sampleRate / 2));
  }

  for (let i = 0; i < bins.length; i++) {
    filters[i] = [];
    const filterRange = i === bins.length - 1 ? bins[i] - bins[i - 1] : bins[i + 1] - bins[i];

    for (let f = 0; f < config.fftSize; f++) {
      if (f > bins[i] + filterRange) {
        // Right, outside of cone
        filters[i][f] = 0;
      } else if (f > bins[i]) {
        // Right edge of cone
        filters[i][f] = 1 - (f - bins[i]) / filterRange;
      } else if (f === bins[i]) {
        // Peak of cone
        filters[i][f] = 1;
      } else if (f >= bins[i] - filterRange) {
        // Left edge of cone
        filters[i][f] = 1 - (bins[i] - f) / filterRange;
      } else {
        // Left, outside of cone
        filters[i][f] = 0;
      }
    }
  }

  /**
   * Applies the filter bank to a power spectrum.
   */
  const bankFilter: BankFilter = (bins: Float32Array) => {
    const returnValue = new Float32Array(filters.length);

    for (let f = 0; f < filters.length; f++) {
      // essentially a dot product
      let total = 0;
      for (let b = 0; b < bins.length; b++) {
        total += bins[b] * filters[f][b];
      }

      returnValue[f] = total;
    }

    return returnValue;
  };

  return {
    filters,
    lowMel: lowMel,
    highMel: highMel,
    deltaMel: deltaMel,
    lowFreq: config.lowFrequency,
    highFreq: config.highFrequency,
    filter: bankFilter,
  };
}

/**
 * Construct the mfcc
 * @param config - Object containing the config for mfccBank
 * (eg: config = {  fftSize: 32,  bankCount: 24,  lowFrequency: 1,
 *   highFrequency: 8000,  sampleRate: 16000,})
 * @param numberOfMFCCs - the number of mfcc you want as output,
 * can't be larger than config.bankCount
 *
 * @description
 * To calculate an MFCC from an audio input, we do the following steps:
 * audio input -> log of power spectrum from FFT -> Resample spectrum on Mel filter bank -> DCT -> MFCC Output
 */
export function constructMfcc(config: MelConfig) {
  const filterBank = constructMelFilterBank(config);

  /**
   * Perform a full MFCC on a FFT spectrum.
   *
   * FFT Array passed in should contain frequency amplitudes only.
   *
   */
  return (fft: Float32Array) => {
    if (fft.length !== config.fftSize) {
      const errorMessage = `Passed in FFT bins were incorrect size. Expected ${config.fftSize} but was ${fft.length}`;
      throw new Error(errorMessage);
    }

    return filterBank.filter(fft);
  };
}
