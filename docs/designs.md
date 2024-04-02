# Designs

We believe that a series of well made components can satisfy the requirements of
a number of UI layouts and designs.

## Search result grid

### Reference Image

![alt text](./media/search-grid.png)

### Notes

- grid of spectrograms and media controls
- additional selection component (out of spec?) overlaid

```html
<div>
    <div>
        <oe-media-controls>
            <oe-spectrogram>
                <source src="https://api.acousticobservatory.org/audio_recordings/123.wav">
            </oe-spectrogram>
        </oe-media-controls>
    </div>
    <!-- repeat 24 times -->
</div>
```

## 
