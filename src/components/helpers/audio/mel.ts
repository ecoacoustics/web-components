// Sourced from
// https://github.com/vail-systems/node-dct/blob/a643a5d071a3a087e2f187c3a764b93568707be1/src/dct.js
// and
// https://github.com/Waxo/sound-parameters-extractor/blob/067a334e699713da227bdb2fc9d25f9de80dcdfd/src/mfcc.js
//
// Both under the MIT license.

/*===========================================================================*\
 * Discrete Cosine Transform
 *
 * (c) Vail Systems. Joshua Jung and Ben Bryan. 2015
 *
 * This code is not designed to be highly optimized but as an educational
 * tool to understand the Mel-scale and its related coefficients used in
 * human speech analysis.
\*===========================================================================*/
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

const cosMap = new Map<number, Array<number>>();

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

// Builds a cosine map for the given input size. This allows multiple input sizes to be memoized automagically
// if you want to run the DCT over and over.
function memoizeCosines(count: number): Array<number> {
  if (cosMap.has(count)) {
    return cosMap.get(count)!;
  }

  const result = new Array(count * count);

  const piOnN = Math.PI / count;

  for (let k = 0; k < count; k++) {
    for (let n = 0; n < count; n++) {
      result[n + k * count] = Math.cos(piOnN * (n + 0.5) * k);
    }
  }

  cosMap.set(count, result);

  return result;
}

function dct(signal: Float32Array, scale?: number | undefined) {
  const length = signal.length;
  scale = scale || 2;

  const cosines = memoizeCosines(length);
  const coefficients = new Float32Array(length).fill(0);

  for (let i = 0; i < length; i++) {
    let sum = 0;

    for (let j = 0; j < length; j++) {
      sum += signal[j] * cosines[j + i * length];
    }

    coefficients[i] = scale * sum;
  }

  return coefficients;
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
    //filters[i].filterRange = filterRange;
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

  //filters.bins = bins;

  const bankFilter: BankFilter = (freqPowers: Float32Array) => {
      const returnValue = new Float32Array(filters.length);

      for (const [fIx, filter] of filters.entries()) {
        let tot = 0;
        for (const [pIx, fp] of freqPowers.entries()) {
          tot += fp * filter[pIx];
        }

        returnValue[fIx] = tot;
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
export function constructMfcc(config: MelConfig, numberOfMFCCs = 12) {
  const filterBank = constructMelFilterBank(config);

  /**
   * Perform a full MFCC on a FFT spectrum.
   *
   * FFT Array passed in should contain frequency amplitudes only.
   *
   */
  return (fft: Float32Array) => {
    if (fft.length !== config.fftSize) {
      const errorMessage = [
        "Passed in FFT bins were incorrect size.",
        `Expected ${config.fftSize} but was ${fft.length}`,
      ];
      throw new Error(errorMessage.join(" "));
    }

    const melSpec = filterBank.filter(fft);
    const melSpecLog = melSpec.map(
            (x) => Math.log(1 + x)
    );

    return dct(melSpecLog).slice(0, numberOfMFCCs);
  };
}
