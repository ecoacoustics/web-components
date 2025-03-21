# Use cases

## Auto advancing?

We should advance to the next page when: all subjects have all necessary decisions made.

If a sub-selection decision does not result in a decision being made about all grid items, we do not advance.

We don't have an auto advance rule for multi class classification; we must have a next page button to advance.

## Verification vs Classification

During verification tasks, the tag is already known, therefore, the `tag`
attribute can be omitted on `oe-decision` elements.

During classification tasks, the user is applying additional tags to a subject.
Therefore, the `tag` attribute must be emitted, while the `verified` attribute
must be omitted.

## questions

1. Are you classifying the data? Or Verifying?
2. Mixed dataset: Are you verifying/classifying one or multiple tags? The mix of tags in the dataset
   1. 100 audio events, all tagged with koala.
      1. e.g. Koala Recognizer
   2. OR 100 audio events, tagged with various tags (koala, cockatoo, kookaburra, etc.)
      1. e.g.BirdNet
3. Are you applying additional tags?
4. Is this multi class classification?

Mixed dataset: only applies for verification. Each subject has only one decision made, for one class. But there's a mix of classes in the dataset.
It only applies for verification you need to have an existing tag/classification to verify against.

Multi class: only applies for classification. Each subject has a decision made several times, for each class.

Additional tags: should be thought of as additional classifications. Does not make sense for classification.

- Are you classifying the data? Or Verifying?
  - -> Classifying
    - Type of classification?
      - -> Single class
      - -> Multi class
  - -> Verifying
    - Mixed dataset?
      - -> Yes
      - -> No

|     | Classifying/Verifying | Multi Class | Mixed Dataset | Additional Tags? | Persona Use Case |
| --- | --------------------- | ----------- | ------------- | ---------------- | ---------------- |
| 1   | Classifying           | TRUE        | N/A           | N/A              | Phil             |
| 2   | Classifying           | FALSE       | N/A           | N/A              | Slade            |
| 3   | Verifying             | N/A         | FALSE         | FALSE            | Slade            |
| 4   | Verifying             | N/A         | TRUE          | FALSE            | NSW/BirdNet      |
| 5   | Verifying             | N/A         | FALSE         | TRUE             | Dani             |
| 6   | Verifying             | N/A         | TRUE          | TRUE             | Unknown??        |

## Use case 1: Multiclass classification for training data (Phil)

### Data

```jsonc
[
  // CSV
  // subject, crow, parrot, koala, blue winged kookaburra, cockatoo, cow
  // A, 1, 0, 0, 0, 0, 0
  {
    "subject": "A",
    "decisions": [
      { "type": "classification", "tag": "crow", "confirmed": "TRUE" },
      { "type": "classification", "tag": "parrot", "confirmed": "FALSE" },
      { "type": "classification", "tag": "koala", "confirmed": "FALSE" },
      { "type": "classification", "tag": "blue winged kookaburra", "confirmed": "FALSE" },
      { "type": "classification", "tag": "cockatoo", "confirmed": "FALSE" },
      { "type": "classification", "tag": "cow", "confirmed": "FALSE" },
    ],
  },
  // ...
]
```

### HTML

```html
<oe-classification true-shortcut="q" tag="crow"></oe-classification>
<oe-classification true-shortcut="w" tag="parrot"></oe-classification>
<oe-classification true-shortcut="e" tag="koala"></oe-classification>
<oe-classification true-shortcut="r" tag="blue winged kookaburra"></oe-classification>
<oe-classification true-shortcut="t" tag="cockatoo"></oe-classification>
<oe-classification true-shortcut="y" tag="cow"></oe-classification>

<!-- This should throw an error -->
<oe-decision tag="ibis" shortcut="U">Ibis</oe-decision>
```

## Use case 2: Single class classification for training data (Slade)

### Data

```jsonc
[
  // CSV
  // subject, crow, parrot, koala, blue winged kookaburra, cockatoo, cow
  // A, 1, 0, 0, 0, 0, 0
  {
    "subject": "A",
    "decisions": [
      { "type": "classification", "tag": "crow", "confirmed": "TRUE" },
      { "type": "classification", "tag": "parrot", "confirmed": "FALSE" },
      { "type": "classification", "tag": "koala", "confirmed": "FALSE" },
      { "type": "classification", "tag": "blue winged kookaburra", "confirmed": "FALSE" },
      { "type": "classification", "tag": "cockatoo", "confirmed": "FALSE" },
      { "type": "classification", "tag": "cow", "confirmed": "FALSE" },
    ],
  },
  {
    "subject": "B",
    "decisions": [{ "tag": "blue winged kookaburra" }],
  },
]
```

### HTML

```html
<oe-classification tag="crow" shortcut="Q"></oe-classification>
<oe-classification tag="parrot" shortcut="W"></oe-classification>
<oe-classification tag="koala" shortcut="E"></oe-classification>
<oe-classification tag="blue winged kookaburra" shortcut="R"></oe-classification>
<oe-classification tag="cockatoo" shortcut="T"></oe-classification>
<oe-classification tag="cow" shortcut="Y"></oe-classification>
```

## Use case 3: Slade (Single Class Verification)

### Data

```jsonc
[
  {
    "subject": "A",
    "decisions": [{ "type": "verification", "tag": "blue winged kookaburra", "confirmed": "TRUE" }],
  },
  {
    "subject": "B",
    "decisions": [{ "type": "verification", "tag": "blue winged kookaburra", "confirmed": "FALSE" }],
  },
  {
    "subject": "C",
    // SKIP
    "decisions": [],
  },
  {
    "subject": "D",
    "decisions": [{ "type": "verification", "tag": "blue winged kookaburra", "confirmed": "UNSURE" }],
  },
]
```

### HTML

```html
<oe-verification verified="true" shortcut="Y"></oe-verification>
<oe-verification verified="false" shortcut="N"></oe-verification>
<oe-verification verified="unsure" shortcut="U"></oe-verification>
<oe-verification verified="skip" shortcut="S"></oe-verification>
```

## Use case 4: BirdNet verification

### Data

```jsonc
[]
```

### HTML

```html
<!-- This the default case -->
<oe-verified verified="true" shortcut="Y"></oe-verified>
<oe-verified verified="false" shortcut="N"></oe-verified>

<!-- This still has meaning -->
<oe-verified verified="skip" shortcut="S"></oe-verified>

<!-- We're not sure what this is used for, but we have to code for the case, even if it is an error -->
<oe-verified verified="true" shortcut="K">Koala</oe-verified>
<oe-verified verified="false" shortcut="L">Noisy Miner</oe-verified>
```

## Use case 5: Dani (Single class verification - Additional Classification)

### Data

```jsonc
[
  {
    "subject": "A",
    "decisions": [
      {
        "type": "verification",
        "tag": "noisy-miner",
        "confirmed": "TRUE",
      },
      {
        "type": "classification",
        "tag": "female",
        "confirmed": "TRUE",
      },
    ],
  },
  {
    "subject": "B",
    "decisions": [
      {
        "type": "verification",
        "tag": "noisy-miner",
        "confirmed": "TRUE",
      },
      {
        "type": "classification",
        "tag": "male",
        "confirmed": "TRUE",
      },
    ],
  },
]
```

### HTML

```html
<oe-verification verified="true" additional-tags="female" shortcut="H"></oe-verification>
<oe-verification verified="true" additional-tags="male" shortcut="J"></oe-verification>
<oe-verification verified="true" additional-tags="fledgling" shortcut="K"></oe-verification>
<oe-verification verified="true" additional-tags="in-flight" shortcut="L"></oe-verification>
<oe-verification verified="false" shortcut="N"></oe-verification>
```

## Use case 6: BirdNet verification with additional labelling task

### Data

```jsonc
[
  {
    "subject": "A",
    "decisions": [
      {
        "tag": "noisy-miner",
        "confirmed": "TRUE",
      },
    ],
  },
  {
    "subject": "B",
    "decisions": [
      {
        "tag": "noisy-miner",
        "confirmed": "TRUE",
      },
      {
        "tag": "rain",
      },
    ],
  },
]
```

### HTML

```html
<!-- This the default case -->
<oe-verification verified="true" shortcut="Y"></oe-verification>
<oe-verification verified="false" shortcut="N"></oe-verification>

<oe-verification verified="true" shortcut="U" additional-tags="rain"></oe-verification>
<oe-verification verified="false" shortcut="M" additional-tags="rain"></oe-verification>

<!-- This still has meaning -->
<oe-verification shortcut="S" skip></oe-verification>
```

Auto page whenever one of the verification decisions are made.
This follows our rule of "auto page when all required decisions have been made"

## use Case 7: Dani (Alternative)

```html
<oe-verification verified="true" shortcut="Y"></oe-verification>
<oe-verification verified="false" shortcut="N"></oe-verification>

<oe-classification tag="male" shortcut="H"></oe-classification>
<oe-classification tag="female" shortcut="J"></oe-classification>
<oe-classification tag="fledgling" shortcut="K"></oe-classification>
<oe-classification tag="in-flight" shortcut="L"></oe-classification>
```

You must make a verification decision and a decision about each classification
tag for the grid to auto page.
