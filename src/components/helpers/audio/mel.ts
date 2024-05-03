// export function constructMelFilterBank(fftSize: number, numberOfFilters, lowF, highF, sampleRate) {
//     const bins = [],
//         fq = [],
//         filters = [];
  
//     const lowM = hzToMels(lowF),
//         highM = hzToMels(highF),
//         deltaM = (highM - lowM) / (numberOfFilters+1);
  
//     // Construct equidistant Mel values between lowM and highM.
//     for (var i = 0; i < numberOfFilters; i++) {
//       // Get the Mel value and convert back to frequency.
//       // e.g. 200 hz <=> 401.25 Mel
//       fq[i] = melsToHz(lowM + (i * deltaM));
  
//       // Round the frequency we derived from the Mel-scale to the nearest actual FFT bin that we have.
//       // For example, in a 64 sample FFT for 8khz audio we have 32 bins from 0-8khz evenly spaced.
//       bins[i] = Math.floor((fftSize+1) * fq[i] / (sampleRate/2));
//     }
  
//     // Construct one cone filter per bin.
//     // Filters end up looking similar to [... 0, 0, 0.33, 0.66, 1.0, 0.66, 0.33, 0, 0...]
//     for (var i = 0; i < bins.length; i++)
//     {
//       filters[i] = [];
//       var filterRange = (i != bins.length-1) ? bins[i+1] - bins[i] : bins[i] - bins[i-1];
//       filters[i].filterRange = filterRange;
//       for (var f = 0; f < fftSize; f++) {
//         // Right, outside of cone
//         if (f > bins[i] + filterRange) filters[i][f] = 0.0;
//         // Right edge of cone
//         else if (f > bins[i]) filters[i][f] = 1.0 - ((f - bins[i]) / filterRange);
//         // Peak of cone
//         else if (f == bins[i]) filters[i][f] = 1.0;
//         // Left edge of cone
//         else if (f >= bins[i] - filterRange) filters[i][f] = 1.0 - (bins[i] - f) / filterRange;
//         // Left, outside of cone
//         else filters[i][f] = 0.0;
//       }
//     }
  
//     // Store for debugging.
//     filters.bins = bins;
  
//     // Here we actually apply the filters one by one. Then we add up the results of each applied filter
//     // to get the estimated power contained within that Mel-scale bin.
//     //
//     // First argument is expected to be the result of the frequencies passed to the powerSpectrum
//     // method.
//     return {
//       filters: filters,
//       lowMel: lowM,
//       highMel: highM,
//       deltaMel: deltaM,
//       lowFreq: lowF,
//       highFreq: highF,
//       filter: function (freqPowers) {
//         const ret = [];
  
//         filters.forEach(function (filter, fIx) {
//           var total = 0;
//           freqPowers.forEach(function (fp, pIx) {
//             total += fp * filter[pIx];
//           });
//           ret[fIx] = total;
//         }); 
//         return ret;
//       }
//     };
//   }
  
//   function melsToHz(mels) {
//     return 700 * (Math.exp(mels / 1127) - 1);
//   }
  
//   function hzToMels(hertz) {
//     return 1127 * Math.log(1 + hertz/700);
//   }
