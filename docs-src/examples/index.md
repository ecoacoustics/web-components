---
layout: example.11ty.js
title: Webcomponents Workspace ⌲ Examples
---

# Examples

## Spectrogram

```html
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
