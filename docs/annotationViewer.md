# Annotation Components

## Annotation Viewer Component (`oe-annotation-viewer`)

```html
<oe-annotation-viewer>
  <oe-spectrogram></oe-spectrogram>

  <oe-annotation
    tags="[{ text: 'laughing-kookaburra' }]"
    low-freq="0"
    high-freq="10_000"
    start-time="30"
    end-time="32"
  ></oe-annotation>
  <oe-annotation
    tags="[{ text: 'koala' }]"
    low-freq="100"
    high-freq="600"
    start-time="28.11"
    end-time="29.2"
    readonly
  ></oe-annotation>
</oe-annotation-viewer>
```

### Annotation Viewer Properties

- `readonly` - Makes all annotations readonly, can be overwritten by setting readonly="false" on the `oe-annotation` component (not currently implemented; all annotations are readonly)

## Annotation Component (`oe-annotation`)

```html
<oe-annotation tags="[{ text: 'koala' }]" low-freq="0" high-freq="10_000" start-time="30" end-time="32"></oe-annotation>
```

### Annotation Properties

- `tags` - An array of `Tag` models for the annotation region

### Annotation Events

- `oe-annotation-created` - Fires when the annotation component is created
- `oe-annotation-updating` - Fires when the user starts dragging / modifying the annotation (not currently implemented; all annotations are readonly)
- `oe-annotation-updated` - Fires when the low-freq, high-freq, start-time, end-time, or tag properties are updated
- `oe-annotation-removed` - Fires when the annotation is deleted

All annotation events are bubbled through the `oe-annotation-viewer` component,
meaning that all of these events should also be documented inside the
`oe-annotation-viewer` component.

### Annotation CSS Parts

- `::part(color)` - Changes the color of the annotations bounding box (defaults to `--oe-primary-color`)

## Usage

### Verification Grid

By default, annotations will be shown as part of the verification grids tile
templates.

To disable this, you can set the `showAnnotations` signal to `false` in the
verification grid's settings.

### Standalone Spectrogram With Annotations

Similar to the axes, and indicator components, you can simply wrap the
`oe-spectrogram` component inside of an `oe-annotation` component.

```html
<oe-annotation-viewer>
  <oe-spectrogram src="/example.flac"></oe-spectrogram>

  <oe-annotation
    tags="[{ text: 'laughing-kookaburra' }]"
    low-freq="0"
    high-freq="10_000"
    start-time="30"
    end-time="32"
  ></oe-annotation>
  <oe-annotation
    tags="[{ text: 'koala' }]"
    low-freq="100"
    high-freq="600"
    start-time="28.11"
    end-time="29.2"
    readonly
  ></oe-annotation>
</oe-annotation-viewer>
```

#### Ordering of Web Components

Because the annotation viewer component will annotate anything that it wraps,
the correct ordering of web components for a spectrogram that has an axes,
indicator, and annotation-viewer component is

1. axes
2. indicator
3. annotation-viewer

##### Example

```html
<oe-axes>
  <oe-indicator>
    <oe-annotation-viewer>
      <oe-spectrogram></oe-spectrogram>
    </oe-annotation-viewer>
  </oe-indicator>
</oe-axes>
```
