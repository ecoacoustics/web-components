---
layout: example.11ty.js
title: Webcomponents Workspace ⌲ Examples
---

# Examples

## Spectrogram

```html
<oe-axes>
  <oe-indicator>
    <oe-spectrogram id="playing-spectrogram" class="large" src="/example.flac" color-map="cubehelix"></oe-spectrogram>
  </oe-indicator>
</oe-axes>
<oe-media-controls for="playing-spectrogram"></oe-media-controls>
```

<oe-axes>
    <oe-indicator>
        <oe-spectrogram
            id="playing-spectrogram"
            class="large"
            src="/example.flac"
            color-map="cubehelix"
        ></oe-spectrogram>
    </oe-indicator>
</oe-axes>
<oe-media-controls for="playing-spectrogram"></oe-media-controls>

<label>
    Window Function
    <select>
        <option selected>Hann</option>
        <option>Hamming</option>
        <option>Lanczos</option>
        <option>Gaussian</option>
        <option>Tukey</option>
        <option>Blackman</option>
        <option>Exact Blackman</option>
        <option>Blackman Harris</option>
        <option>Blackman Nuttall</option>
        <option>Kaiser</option>
        <option>Flat Top</option>
    </select>
</label>

<label>
    Window Size
    <input type="number" value="512" list="fft-window-size-options" />
    <datalist id="fft-window-size-options">
        <option value="256"></option>
        <option value="512"></option>
        <option value="1024"></option>
        <option value="2048"></option>
    </datalist>
</label>

<label>
    Window Overlap
    <input type="number" value="512" list="fft-window-overlap-options" />
    <datalist id="fft-window-overlap-options">
        <option value="256"></option>
        <option value="512"></option>
        <option value="1024"></option>
        <option value="2048"></option>
    </datalist>
</label>

<label>
    Color Map
    <select>
        <option>Grayscale</option>
        <option>Audacity</option>
        <option>Raven</option>
        <option>Cube Helix</option>
        <option>Viridis</option>
        <option>Turbo</option>
        <option>Plasma</option>
        <option>Inferno</option>
        <option>Magma</option>
        <option>Gamma II</option>
        <option>Blue</option>
        <option>Green</option>
        <option>Orange</option>
        <option>Purple</option>
        <option>Red</option>
    </select>
</label>

<label>
    Brightness
    <input type="number" value="0" />
</label>

<label>
    Contrast
    <input type="number" value="1" />
</label>
