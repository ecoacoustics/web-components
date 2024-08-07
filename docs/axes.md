# Axes component

```html
<oe-axes scale="linear | logarithmic" step="100" x-axis y-axis x-grid y-grid></oe-axes>
```

## Attributes

- `scale` (should not be functional for initial prototypes) (probably a D3-Scale object)
- `step`
- `x-axis`
- `y-axis`
- `x-grid` (should not be functional for initial prototypes)
- `y-grid` (should not be functional for initial prototypes)

_Note: No `for` attribute since I believe we reached a consensus; that we are going to be nesting the `oe-spectrogram` inside `oe-axes`_

## Relevant models

- `Audio` (so that we know the sample rate)
- `TwoDSlice` (in px values where the user has scrolled to)
- `RenderCanvasSize` (describes the shape of the `HTMLCanvasElement`)
- `RenderWindow`

Spectrogram should emit a `RenderCanvasSize` in px. Using a `ResizeObserver`, when the canvas size changes, we should emit a new `RenderCanvasSize` in a `CustomEvent`
The `oe-axis` component should have its `<li>` elements this size

`TwoDSlice` should change when the `ResizeObserver` triggers or the user drags to a new location (**not going ot be implemented in the prototypes**) to ensure that _x1 - x0 !> width_ and _y1 - y0 !> height_

The spectrogram should also emit a `RenderWindow` object that changes when `RenderCanvasSize`, `TwoDSlice`, or `Audio` model changes

The `oe-axes` component should use the `step` attribute to calculate the difference between the `startOffset` and the `endOffset` (in the `RenderWindow`), find the average and floor the result to find out what the `step` should be. The last tick in the axis should always show `endOffset` flush with the end if the `endOffset` is not equal to the last _step_ tick.

## Conversions

We'll use the `TwoDSlice` and `Audio` element to calculate the `RenderWindow` in the`oe-spectrogram` component (convert in the `oe-spectrogram` component???? Or should this be done in the `RenderWindow` model where we create a `RenderWindow` from `Audio` and `RenderCanvasSize` in the constructor???)

The `RenderWindow` will be calculated using an algorithm similar to

```ts
import * as UC from "unit-converters";

new RenderWindow({
  startOffset: UC.pixelsToSeconds(audio, slice.x0),
  endOffset: UC.pixelsToSeconds(audio, slice.x1),
  lowFrequency: UC.pixelsToHertz(audio, slice.y0),
  highFrequency: UC.pixelsToHertz(audio, slice.y1),
});
```

---

From the `RenderWindow`, we should be able to create `oe-axes`
