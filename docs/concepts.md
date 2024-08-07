# Concepts

![diagram](./media/concepts.drawio.svg)

To render a spectrogram we're essentially showing a slice of the audio data
with various transforms applied, each possibly having their own window.

## The original recording

A recording. We'd like to know as little about this recording as possible.

- duration
  #- sample rate --> nyquist --> max frequency (min will always be 0)

## segment: A segment of a recording

A slice of an original audio recording.

The main difference between this an original is that a segment will a non-zero
coordinate system, because it is a slice of the original recording.

- offset time
- sample rate (inferred from media)
- duration (inferred from media)

## A FFT transform (the spectrogram)

- window size
- window overlap
- window type: hamming, hanning, etc.
- scale: linear, mel scale, log
- colour controls
  - contrast
  - brightness
  - colour map
    - ideally perspective preserving of intensity
    - e.g. <https://people.phy.cam.ac.uk/dag9/CUBEHELIX/cubetry.html>

## A render window

A slice of the spectrogram.
We can use the window for:

- zoom!
- paging!

![render window](./media/paging.drawio.svg)

There are two different types of paging: paging the window over the segment of
audio, and if there is more than one segment of audio, paging over the segments.
(diagram above)

When the window changes, the coordinate system for the spectrogram changes.

These changes need to be reactive. Things be rerendered when the window changes.

The render window is a canvas, which is a dom element. That it's own size which
can also change.

So we're essentially maintaining a map between two windows and coordinate systems.

A: the slice of audio and the spectrogram
B: the size of the canvas

## Other decorations (annotations)

Other decorations are drawn on top of the render window.

They will not be drawn on the spectrogram itself.

Likely with svg over the top?
