# Listen and Annotation Componentization

## Status

Started - assigned to Hudson

## Skills

- Expert knowledge of web technologies
- Javascript (advanced)
- Typescript
- Angular
- D3
- WebComponents

## Outcomes

1. a prototype web interface for sub-sampling playback, annotation, and possibly validation
2. an beta integrated with the Acoustic Workbench

## Description

The listen page on the Acoustic Workbench is old, convoluted, difficult to
maintain and difficult to upgrade.

For a detailed list of the problems, and potential solutions, see the associated
[Listen Page User Experience](./Listen%20UX.md) project.

**NOTE**: This project will remain design agnostic! Design decisions will be made
by the [Listen Page User Experience](./Listen%20UX.md) project. This project will
build components that can be composed into _multiple different_ designs,
depending on the need of the project and target audience.

The goal of this project is to re-implement some of the core components of the
listen page. When being re-implemented, the components should:

- be independent
- be composable
- be reusable in basic static web pages
- be web components
  - they should be fully useable in basic cases via html attributes and elements
  - they should have a secondary, more advanced DOM object API
  - the DOM API holds the "true" data objects and the DOM attributes are
    serialized simplifications
  - should use shadow DOM where necessary
- be styleable and ship with an agnostic default style (see `::part` and `::theme`)
- be compiled to single-file javascript packages
- be published to npm as source (so consumers can tree shake)
- be stored in out [components repo](https://github.com/QutEcoacoustics/ecoacoustics-web-components)
- must have documentation with examples
- be well tested
- ensure that when used as part of a larger framework (e.g. together and,
  compiled from source) common dependencies should not be duplicated in compiled output
- ensure that when used as part of any framework, should be isolated and interoperable
- allow for more dynamic interactions with data
  - especially through the use of client-side generated spectrograms
- we should be able to export an entire component tree as an image
  - e.g. to save a spectrogram with annotations as an image
- everything should be in SI units, un-prefixed. e.g. seconds, hertz, meters
  - except for in presentation where it is appropriate to use
- all measurements should aligned to the start of a recording
  - e.g. seconds from the start of a recording
- prefer coordinates + coordinates over coordinates + magnitude
  - e.g. start and end seconds, rather than start seconds and duration

### Technologies

- Web components should be with the Lit framework
  - <https://lit.dev>
  - We chose Lit because it is a small, fast, and modern web component library
- Visualization should be done via `<canvas />` elements (and not `<img>` elements)
  - Open to discussion
- D3 should be used for scales and unit conversions
  - e.g. <https://github.com/d3/d3-scale>
- DOM elements should be used for diagrammatic representations of annotations
  - annotations should not be rendered on `<canvas />`
  - annotations may be rendered with HTML
  - annotations may be rendered with SVG (optimal for image-export features)
- preact/signals: https://www.npmjs.com/package/@lit-labs/preact-signals

### Diagram

**THIS PROPOSAL IS INCOMPLETE**

![class diagram](./media/element_class_diagram.drawio.svg)

### The components

#### Spectrogram (`<oe-spectrogram></oe-spectrogram>`)

Shows a spectrogram for a given media source.

We want this to work at various sizes:

- Full page width spectrogram
  - page for new segments (audacity style)
  - or translate
- Snippets

  - variable-width but generally short (1 to 10 seconds)
  - fixed duration of media
  - maybe with some padding
  - support for many on a page - e.g. a grid of 25

- Can accept one or multiple sources
  - URL endpoint - for a whole file
  - Base URL endpoint to query for parts of a file (callback?)
  - User selected whole file input
- Can change
  - ColorProfile - grey scale, viridis, etc
  - WindowSize - e.g. 512, 1024, 2048, 4096
  - WindowOverlap - e.g. 0.5, 0.75
  - WindowType - hammng, hanning, etc
  - MelScale or linear scale
- Is dynamically resizeable
- Can snap to aspect ratios
- Can zoom vertically and horizontally

- investigate:
  - screenshot participation
  - spectrogram generation
    - particularly: faster than real time rendering
    - and only rendering what is in the view port
  - web workers for spectrogram generation
  - probably use a canvas element
  - resize observer
  - request animation frame for frequent updates - particularly current time
  - Emitting a D3-scale object

#### Axes (`<oe-axes>`)

Shows axes and gridlines for a target

- Needs a linking method
  - Must have a target (`for` like a label)
  - Or must wrap a target (e.g. a `<oe-spectrogram>` element)
- Target may have coordinates
  - or else coordinates may be referred to
- automatically
  - sizes to match target's boundaries
  - overlays itself on target
- Can enable or disable
  - x axis
  - y axis
  - x grid lines
  - y grid lines
- Can customize
  - x scale step
  - y scale step (separated from _x scale step_ because the units are not the same)
  - to show end tick (e.g. prioritize showing end value tick over last scale step tick)
  - axis labels
  - axis position

#### Annotation surface (`<oe-annotation>`)

- Must have a target
  - either linked (`for`)
  - or wrapped
- Target may have coordinates
  - or else coordinates may be referred to
- has a `readonly` attribute (which disables mutation)
- automatically
  - sizes to match target's boundaries
  - overlays itself on target
- can have many annotations
  - an annotation has coordinates
    - coordinates can be specified
      - in the units of the target
      - or in units value for a target that does not have a unit/coordinate interface
  - an annotation may be temporally-dimensional (i.e. full-spectrum)
  - an annotation may have one or many tags
- the surface editor will fire events that allow other components to interact
  with it, such as:
  - annotation created
  - annotation added
  - annotation updating (high frequency)
  - annotation updated
  - annotation removed

#### Annotation Editor/Tag editor (`<oe-tag-editor> ????????`)

- need some way to add or remove tags to annotations
- maybe this does not need to be a component?

#### Position indicator (`oe-indicator>`)

- Must have a target
  - either linked (`for`)
  - or wrapped
- Target must be a `spectrogram`
- Does have a position
- Is interactive
  - via grab handle out of bounds

#### ~~Annotation container (`<oe-annotation-container> ??????`)~~

- Generic container (e.g. div)
- It will measure itself and provide information to children such as
  - margin
  - padding
  - dimensions
- Essentially the "image" that would get saved if we could save HTMLElement trees
  as images.

2024: Pretty sure we don't need this anymore. Intent was inter-component communication
but that now is taken care of via [lit context](https://lit.dev/docs/data/context/).

#### Verification Grid (`<oe-verification-grid>`)

- A grid of spectrograms/annotation wrappers
- Purpose is to apply some data (e.g. a tag or additional classification) to
  a set of spectrograms
- It needs to show a subset of a larger dataset
  - some kind of pagination mechanism
    - a fixed list, client side, that we page through
    - or base url, and dynamic data, through a callback a la typeahead
- Needs pagination controls
- It needs decision controls
  - for the group
  - for the individual
    - selection controls (shift for range select, ctrl for multi select)
- We need to be able to a customize a decision
  - e.g. a list of actions like
    - "This is a koala" -> apply a koala tag to all events
    - "Everything on this page is verified" (TP)
    - "Everything on this page is not verified (FP)
  - probably use events when a decision is made
    - e.g. `decision-made` event with content (`name` attribute value)
  - probably slots for the decisions that are available
    - e.g. `<oe-decision name="verified">Koala</oe-decision>`
    - e.g. `<oe-decision name="not-verified">Not a Koala</oe-decision>`
- Use keyboard controls to
  - page
  - and to make decisions
  - custom keybindings
- Needs to be able to export annotations with the decisions

### Use cases / scenarios

All use cases have the following in their header:

```html
<script type="module" src="somecdn.org/oe-components-1.2.3.js" >
```

#### Show a spectrogram for some audio

```html
<body>
  <oe-spectrogram src="./myaudio.wav" />
</body>
```

#### Show a spectrogram for some audio, with grid lines and axes

```html
<body>
  <oe-spectrogram id="spectrogram" src="./myaudio.wav" />
  <oe-axes for="spectrogram" />
</body>
```

OR

```html
<body>
  <oe-axes>
    <oe-spectrogram id="spectrogram" src="./myaudio.wav" />
  </oe-axes>
</body>
```

#### Show a spectrogram for some audio, with customized grid lines and axes

```html
<body>
  <oe-spectrogram id="spectrogram" src="./myaudio.wav" />
  <oe-axes for="spectrogram" show="x,y" step="5,10" last-value="x,y">
    <span slot="x-axis-label">Time (seconds, relative to start of file)</span>
    <span slot="y-axis-label">Freq.</span>
  </oe-axes>
</body>
```

```html
<body>
  <oe-axes show="x,y" step="5,10" last-value="x,y">
    <oe-spectrogram id="spectrogram" src="./myaudio.wav" />
    <span slot="x-axis-label">Time (seconds, relative to start of file)</span>
    <span slot="y-axis-label">Freq.</span>
  </oe-axes>
</body>
```

#### Show a fixed set of annotations over any element on a simple page

```html
<body>
    <img id="FCS" src="my_FCS.png" />
    <oe-annotate for="FCS" readonly>
        <oe-annotation left="0.12" top="0.16" height="0.55" width="0.3">
            <oe-tag value="123">Koala</oe-tag>
            <oe-tag value="28">Phascolarctos cinereus</oe-tag>
            <oe-tag>Male</oe-tag>
        </oe-annotation>
        <oe-annotation  /> <!-- snip -->
    <oe-annotate />
</body>
```

#### Show a fixed set of annotations over any element on a simple page, with a given coordinate system

```html
<body>
    <oe-coordinates id="wrapper" high-frequency="11025" low-frequency="0" start-seconds="3600" end-seconds="86400">
        <img id="FCS" src="my_FCS.png" />
    </oe-coordinates>
    <oe-annotate for="wrapper" readonly="true">
        <oe-annotation start-seconds="7200" end-seconds="10800" low-frequency="1000" high-frequency="7000" >
            <oe-tag>Koala</oe-tag>
            <oe-tag>Phascolarctos cinereus</oe-tag>
            <oe-tag>Male</oe-tag>
        </oe-annotation>
        <oe-annotation  /> <!-- snip -->
    <oe-annotate />
</body>
```

#### Show a fixed set of annotations over a spectrogram

```html
<body>
  <oe-spectrogram id="spectrogram" src="my_audio.wav" />
  <oe-annotate for="spectrogram" readonly>
    <!-- coordinate system pulled from spectrogram -->
    <oe-annotation start-seconds="36.53" end-seconds="41.32" low-frequency="600" high-frequency="1600">
      <oe-tag>Koala</oe-tag>
      <oe-tag>Phascolarctos cinereus</oe-tag>
      <oe-tag>Male</oe-tag>
    </oe-annotation>
    <oe-annotation />
    <!-- snip -->
  </oe-annotate>
</body>
```

#### Show existing annotations, and allow new ones to be created, on a spectrogram

```html
<body>
    <oe-spectrogram id="spectrogram" >
        <source type="audio/wave" source="my_audio.wav" />
        <source type="audio/vorbis" source="my_audio.ogg" />
    </oe-spectrogram>
    <oe-axes for="spectrogram" />
    <position-indicator for="spectrogram">
    <oe-annotate id="annotationEditor" target="spectrogram">
        <!-- coordinate system pulled from spectrogram -->
        <oe-annotation start-seconds="36.53" end-seconds="41.32" low-frequency="600" high-frequency="1600">
            <oe-tag>Koala</oe-tag>
            <oe-tag>Phascolarctos cinereus</oe-tag>
            <oe-tag>Male</oe-tag>
        </oe-annotation>
        <oe-annotation  /> <!-- snip -->
    <oe-annotate />
    <!-- play, pause, volume -->
    <oe-media-controls for="spectrogram" ></oe-media-controls>
</body>
```

_TODO: Add verification grid example_

Use a template element inside a slot for a spectrogram component

These components will pre-fetch and cache the previous and next pages for quick navigation.
Because we have pre-fetched the next page, we can use this to test if the next page exists.
This means that the component does not depend on a data structure for pagination.

All the `oe-verification-grid` component takes as a callback that can be used to instantiate
an array of validation items.

- Single-class (verify a single existing tag)
- Multi-class (verify multiple existing tags)
- Single-class and add additional tags
- Multi-class and add additional tags

```ts
interface VerificationGrid {
  download: () => unknown;
  nextPage: () => unknown;
  previousPage: () => unknown;
}
```

##### Single Class

Existing tag

```html
<oe-verification-grid id="verification-grid" getPage="(pageNumber) => getPage(pageNumber)">
  <template>
    <oe-spectrogram id="playing-spectrogram"></oe-spectrogram>
    <oe-media-controls for="playing-spectrogram"></oe-media-controls>
  </template>

  <oe-next shortcut="B">Back</oe-next>
  <oe-previous shortcut="S">Skip</oe-previous>

  <!-- Maybe something like -->
  <oe-decision value="verified" tag="koala" shortcut="Y">Koala</oe-decision>
  <oe-decision value="not-verified" tag="koala" shortcut="N">Not a Koala</oe-decision>
</oe-verification-grid>

<script>
  document.getElementById("verification-grid").addEventListener("decision-made", (decision) => {
    console.log(decision);
  });
</script>
```

##### Multi Class

Existing tags

Are all the tags that are applied correct (Y/N)

Tag attribute is not present

```html
<oe-verification-grid id="verification-grid" getPage="(pageNumber) => getPage(pageNumber)">
  <!-- Snip -->
  <oe-decision value="verified" shortcut="Y">Labeled Correctly<oe-decision>
  <oe-decision value="not-verified" shortcut="N">Labeled Incorrect<oe-decision>
</oe-verification-grid>
```

##### Single Class, additional tags

```html
<oe-verification-grid id="verification-grid" getPage="(pageNumber) => getPage(pageNumber)">
  <!-- Snip -->
  <oe-decision value="verified" shortcut="1" tag="Red-tail Black Cockatoo" additional-tags="adult"><oe-decision>
  <oe-decision value="verified" shortcut="2" tag="Red-tail Black Cockatoo" additional-tags="juvenile"><oe-decision>
  <oe-decision value="verified" shortcut="3" tag="Red-tail Black Cockatoo" additional-tags="fledgling"><oe-decision>
  <oe-decision value="verified" shortcut="4" tag="Red-tail Black Cockatoo" additional-tags="juvenile, fledgling"><oe-decision>
  <oe-decision value="verified" shortcut="5" tag="Red-tail Black Cockatoo" additional-tags="flight"><oe-decision>
  <oe-decision value="not-verified" shortcut="0" tag="Red-tail Black Cockatoo">No Cockatoo<oe-decision>
  <oe-decision value="not-verified" shortcut="9" tag="Red-tail Black Cockatoo">No Cockatoo (but other bird)<oe-decision>
</oe-verification-grid>
```

##### Multi Class, additional tags

If you're not interested in verification, but you are interested in adding more tags to an event

```html
<oe-verification-grid id="verification-grid" getPage="(pageNumber) => getPage(pageNumber)">
  <!-- Snip -->
  <oe-decision value="verified" shortcut="1" additional-tags="adult"><oe-decision>
  <oe-decision value="verified" shortcut="2" additional-tags="juvenile"><oe-decision>
  <oe-decision value="verified" shortcut="3" additional-tags="fledgling"><oe-decision>
  <oe-decision value="verified" shortcut="4" additional-tags="juvenile, fledgling"><oe-decision>
  <oe-decision value="verified" shortcut="5" additional-tags="flight"><oe-decision>
  <oe-decision value="not-verified" shortcut="0">No Cockatoo<oe-decision>
  <oe-decision value="not-verified" shortcut="9">No Cockatoo (but other bird)<oe-decision>
</oe-verification-grid>
```

<!--
Helper functions to load resources:

- `oe.loadUrl(url)`
- `oe.loadList(...items)`

```html
<oe-verification-grid getPage="oe.loadUrl('grid-items.json')" pageSize="10">
  <oe-spectrogram slot="spectrogram"></oe-spectrogram>
</oe-verification-grid>
```
-->

OR

```html
<oe-verification-grid src="grid-items.json" gridSize="10">
  <oe-spectrogram slot="spectrogram"></oe-spectrogram>
</oe-verification-grid>
```
