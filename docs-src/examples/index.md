---
layout: example.11ty.cjs
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
        src="/merged_diagnostic.wav"
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
            src="/merged_diagnostic.wav"
            color-map="cubehelix"
        ></oe-spectrogram>
    </oe-indicator>
</oe-axes>
<oe-media-controls for="playing-spectrogram"></oe-media-controls>
