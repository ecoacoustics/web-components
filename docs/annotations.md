# Annotation Components

## Annotation Viewer Component (`oe-annotate`)

```html
<oe-annotate>
  <oe-spectrogram></oe-spectrogram>

  <oe-annotation
    tags="laughing-kookaburra"
    low-frequency="0"
    high-frequency="10_000"
    start-time="30"
    end-time="32"
  ></oe-annotation>
  <oe-annotation low-frequency="100" high-frequency="600" start-time="28.11" end-time="29.2" readonly>
    <oe-tag value="koala">Koala</oe-tag>
    <oe-tag value="kookaburra">
      <img src="kookaburra.png" alt="A picture of a kookaburra" />
    </oe-tag>
  </oe-annotation>
</oe-annotate>
```

### Annotation Viewer Properties

- `readonly` - Makes all annotations readonly, can be overwritten by setting readonly="false" on the `oe-annotation` component (annotation viewer readonly should always take precedence over the `oe-annotation` readonly state. E.g. If `oe-annotate` is readonly, and an annotation has `readonly="false"`, the annotation should still be readonly because the `oe-annotate`'s readonly property takes precedence.)
  - Can edit? Annotation not readonly and annotation viewer is not readonly
- `tag-style` { hidden | edge | spectrogram-top } - An enum attribute which can be used to stop showing tags

## Annotation Component (`oe-annotation`)

```html
<oe-annotation
  tags="koala,male"
  low-frequency="0"
  high-frequency="10_000"
  start-time="30"
  end-time="32"
></oe-annotation>
```

### Annotation Properties

- `tags` - An array of `Tag` models for the annotation region
  - The tags attribute can be a comma separated list of strings
  - We can also accept tags as `oe-tag` through a slot
  - We can accept complex objects via a property (not an attribute)

### Annotation Events

- `oe-annotation-created` - Fires when the annotation component is created
- `oe-annotation-updating` - Fires when the user starts dragging / modifying the annotation (not currently implemented; all annotations are readonly)
- `oe-annotation-updated` - Fires when the low-frequency, high-frequency, start-time, end-time, or tag properties are updated
- `oe-annotation-removed` - Fires when the annotation is deleted
- `oe-annotation-selected` - Fires when the annotation is selected. Triggered by `focus`, and also emits an `Annotation` model (along with setting a `selected` property)
- `oe-annotation-deselected` - Fires when the annotation is de-selected Triggered by `blur`, and also emits an `Annotation` model (along with setting a `selected` property)
- `oe-annotations-changed` - Something about the `oe-annotate`'s light dom template has changed. E.g. the DOM node has been copied or moved. This is useful for any accessory component that renders part of the list (in another format).

All annotation events are bubbled through the `oe-annotate` component,
meaning that all of these events should also be documented inside the
`oe-annotate` component.

### Annotation CSS Variables

- `--oe-annotation-color` - Changes the color of the annotations bounding box (defaults to `--oe-primary-color`)

## Usage

### Verification Grid (future work)

By default, annotations will be shown as part of the verification grids tile
templates.

To disable this, you can set the `showAnnotations` signal to `false` in the
verification grid's settings.

### Standalone Spectrogram With Annotations

Similar to the axes, and indicator components, you can simply wrap the
`oe-spectrogram` component inside of an `oe-annotation` component.

```html
<oe-annotate>
  <oe-spectrogram src="/example.flac"></oe-spectrogram>

  <oe-annotation
    tags="koala"
    low-frequency="100"
    high-frequency="600"
    start-time="28.11"
    end-time="29.2"
    readonly
  ></oe-annotation>
  <oe-annotation
    tags="laughing-kookaburra,female"
    low-frequency="0"
    high-frequency="10_000"
    start-time="30"
    end-time="32"
  ></oe-annotation>
</oe-annotate>
```

#### Nested Order of Web Components

Because the annotation viewer component will annotate anything that it wraps,
the correct ordering of web components for a spectrogram that has an axes,
indicator, and annotation-viewer component is

1. axes
2. indicator
3. annotation-viewer

Ideally the order of the web components would not be important, however, at the
moment we are limited into specifying an order.
We hope to remove this in the future.

##### Example

```html
<oe-axes>
  <oe-indicator>
    <oe-annotate>
      <oe-spectrogram></oe-spectrogram>
    </oe-annotate>
  </oe-indicator>
</oe-axes>
```
