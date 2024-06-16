# Web Audio Architecture

- `OfflineAudioContext` allows for processing audio as past as possible and is not intended for listening / interaction
  - It is possible to stop, play, and resume an offline audio context
- `AudioContext` is designed for real time audio playing and manipulation of data
- `AnalyzerNode`
  - Does not modify its samples. It's input and output are identical
  - It does an fft which seems like an ideal choice
  - But, the assumption is that it is used in a real time audio context
    - You have to call the functions that return the frequency domain data yourself and at the right time
  - This isn't an issue in a real time context because you can use `requestAnimationFrame` to repeatedly query the analyzer node for the frequency data, this all happens at the right time. Because the polling always happens at a real time speed
  - Using this whereas using `AnalyzerNode` in an offline context, the rendering finishes before we can even sample any of the frequency data
  - `RequestAnimationFrame` is not suitiable because `OfflineAudioContext` is so fast that we sampling 60fps is too slow to get all the frequency data that we need
- `ScriptProcessor` is an `AudioNode` allows us to run custom code after a window of size of samples that we choose
  - Eg. After every 1024 samples, an even can fire and we execute some code
  - At first this seems like a great solution for sampling frequency data with an `OfflineAudioContext`.
    - But it is deprecated because the callback runs on the render thread which is
      - Really slow for real time playback
      - For offline playback, the slowness by running on the render thread is exponentially worse
- We can't pull data directly from a `HTMLAudioElement` and pipe it to an `OfflineAudioContext` (it works for `AudioContext` aka real time)
  - Instead we have to use a `fetch()` to download the file and decode in its entirety
  - Downsides of using `fetch()`, we have to download the file twice, and is probably not cached (because the media element uses range requests to download fractions of a file. So the requests are different, resulting in a cache miss)
    - We are not sure of this behavior
  - Another downside of using fetch is that it decodes the entire audio file as uncompressed PCM data into a javascript array 😱
    - This is easily enough data to crash a tab for any file longer than a few seconds
- `AudioWorklet` Is a way to create or run a custom audio node in the audio thread
  - It is the replacement for `ScriptProcessor` (which runs in the main render thread)
  - However, each invocation of the process function receives only 128 samples
  - Even if we received more samples we don't want to do lots of heavy work on the worklet node or else it will effect the playback speed of an `AudioContext`
  - This might not matter for an `OfflineAudioContext`??
  - Audio worklets can access shared array buffers via custom implementation of the `AudioWorkletNode` <https://github.com/GoogleChromeLabs/web-audio-samples/blob/main/src/audio-worklet/design-pattern/shared-buffer/main.js>
  - FYI: `AudioWorkletGlobalScope` exposes the current time, sample index, and sample rate
- Web `Worker`s
  - Don't support `OfflineAudioContext` or even `AudioContext`
    - This means that we cannot use the analyzer node in the script processor combination in a background worker thread
  - They do support shared array buffers and sharing those buffers with an `AudioWorklet`
  - They do support offloading canvas element rendering to the worker (`OfflineCanvas`)
- `WebCodec`'s is a project that will expose the browsers audio and video decoding and encoding to users
  - This will allow us to render partial fragments of a larger audio file by requesting small chunks of data the same way `HTMLAudioElement` does now
  - Chrome stable current supports it, FireFox nightly current supports it, Safari unknown

## The Plan

Until the web codec project is stable and available, we are going to be limited to rendering short spectrograms of audio.
We don't know how large yet but we are guessing no more than a minute or no more than 5 seconds for multiple spectrograms on a page.
We don't need to render more than that to fulfil the verification interface use case, so we'll progress using `decodeAudioData` + `fetch()` for now.

Fetch will still result in a double download, but since we constrained to short audio recordings, the overhead should be minimal.
We could use `OfflineAudioContext` piped to an `AudioContext` which is connected to a `HTMLAudioElement` to avoid this double download.
But it is more work for a solution that will be obsolete with the introduction of the web codec apis.
_We might do it if we have time._

Once we have the file (`OfflineAudioContext` + `fetch()`), we can use `AudioWorkletProcessor` to collect samples into a shared array buffer.
Once enough samples are accumulated to render the FFT, we can send a message to the worker to tell it to perform the fft on a web worker thread and store it in another buffer (or even paint it directly to a canvas).
For this plan to work, we will probably use an FFT library, the industry standard here is to ship WASM which we probably won't do.
