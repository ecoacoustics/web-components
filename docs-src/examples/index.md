---
layout: example.11ty.js
title: Webcomponents Workspace ⌲ Examples
---

<script>
let spectrogramElement = null;

window.onload = () => {
    spectrogramElement = document.getElementById("playing-spectrogram");
};

function updateAttribute(attribute, value) {
    spectrogramElement.setAttribute(attribute, value);
}
</script>

<style>
label {
    display: block;
    padding-bottom: 1rem;
}

oe-spectrogram {
    position: relative;
    width: 400px;
    height: 300px;
}
</style>

# Examples

```html
<oe-axes>
  <oe-indicator>
    <oe-spectrogram id="playing-spectrogram" src="/example.flac"></oe-spectrogram>
  </oe-indicator>
</oe-axes>
<oe-media-controls for="playing-spectrogram"></oe-media-controls>
```

<div class="container">
    <div class="row">
        <div class="col">
            <oe-axes>
                <oe-indicator>
                    <oe-spectrogram
                        id="playing-spectrogram"
                        src="/example.flac"
                        color-map="audacity"
                    ></oe-spectrogram>
                </oe-indicator>
            </oe-axes>
            <oe-media-controls for="playing-spectrogram"></oe-media-controls>
        </div>
        <div class="col">
            <label>
                Window Function
                <select class="form-select" onchange="updateAttribute('window-function', event.target.value)">
                    <option value="hann" selected>Hann</option>
                    <option value="hamming">Hamming</option>
                    <option value="lanczos">Lanczos</option>
                    <option value="gaussian">Gaussian</option>
                    <option value="tukey">Tukey</option>
                    <option value="blackman">Blackman</option>
                    <option value="exact-blackman">Exact Blackman</option>
                    <option value="blackman-harris">Blackman Harris</option>
                    <option value="backman-nuttall">Blackman Nuttall</option>
                    <option value="kaiser">Kaiser</option>
                    <option value="flat-top">Flat Top</option>
                </select>
            </label>
            <label>
                Window Size
                <input
                    type="number"
                    value="512"
                    list="fft-window-size-options"
                    class="form-control"
                    onchange="updateAttribute('window-size', Number(event.target.value))"
                />
                <datalist id="fft-window-size-options">
                    <option value="256"></option>
                    <option value="512"></option>
                    <option value="1024"></option>
                    <option value="2048"></option>
                </datalist>
            </label>
            <label>
                Window Overlap
                <input
                    type="number"
                    value="512"
                    list="fft-window-overlap-options"
                    class="form-control"
                    onchange="updateAttribute('window-overlap', Number(event.target.value))"
                />
                <datalist id="fft-window-overlap-options">
                    <option value="256"></option>
                    <option value="512"></option>
                    <option value="1024"></option>
                    <option value="2048"></option>
                </datalist>
            </label>
            <label>
                Color Map
                <select class="form-select" onchange="updateAttribute('color-map', event.target.value)">
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
                <input 
                    type="number"
                    value="0"
                    step="0.1"
                    class="form-control"
                    onchange="updateAttribute('brightness', Number(event.target.value))"
                />
            </label>
            <label>
                Contrast
                <input
                    type="number"
                    value="1"
                    step="0.1"
                    class="form-control"
                    onchange="updateAttribute('contrast', Number(event.target.value))"
                />
            </label>
        </div>
    </div>
</div>

