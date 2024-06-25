# USe cases

# Auto advancing?

We should advance to the next page when: all subjects have all necessary decisions made.

If a sub-selection decision does not result in a decision being made about all grid items, we do not advance.

We don't have an auto advance rule for multi class classification; we must have a next page button to advance.

# questions

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
      { "type": "classification", "tag": "cow", "confirmed": "FALSE" }
    ]
  }
  // ...
]
```

### HTML

```html
<oe-classification tag="crow" shortcut="Q">Crow</oe-classification>
<oe-classification tag="parrot" shortcut="W">Parrot</oe-classification>
<oe-classification tag="koala" shortcut="E">Koala</oe-classification>
<oe-classification tag="blue winged kookaburra" shortcut="R">Blue Winged Kookaburra</oe-classification>
<oe-classification tag="cockatoo" shortcut="T">cockatoo</oe-classification>
<oe-classification tag="cow" shortcut="Y">Cow</oe-classification>

<!-- This should throw an error -->
<oe-decision tag="ibis" shortcut="U">Ibis</oe-decision>

<oe-decision shortcut="S" skip>Skip</oe-decision>
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
      { "type": "classification", "tag": "cow", "confirmed": "FALSE" }
    ]
  },
  {
    "subject": "B",
    "decisions": [{ "tag": "blue winged kookaburra" }]
  }
]
```

### HTML

```html
<oe-decision tag="crow" shortcut="Q">Crow</oe-decision>
<oe-decision tag="parrot" shortcut="W">Parrot</oe-decision>
<oe-decision tag="koala" shortcut="E">Koala</oe-decision>
<oe-decision tag="blue winged kookaburra" shortcut="R">Blue Winged Kookaburra</oe-decision>
<oe-decision tag="cockatoo" shortcut="T">cockatoo</oe-decision>
<oe-decision tag="cow" shortcut="Y">Cow</oe-decision>

<oe-decision shortcut="S" skip>Skip</oe-decision>
```

## Use case 3: Slade

### Data

```jsonc
[
  {
    "subject": "A",
    "decisions": [{ "type": "verification", "tag": "blue winged kookaburra", "confirmed": "TRUE" }]
  },
  {
    "subject": "B",
    "decisions": [{ "type": "verification", "tag": "blue winged kookaburra", "confirmed": "FALSE" }]
  },
  {
    "subject": "C",
    // SKIP
    "decisions": []
  },
  {
    "subject": "D",
    "decisions": [{ "type": "verification", "tag": "blue winged kookaburra", "confirmed": "UNSURE" }]
  }
]
```

### HTML

```html
<oe-decision verified="true" tag="blue winged kookaburra" shortcut="Y">Blue Winged Kookaburra</oe-decision>
<oe-decision verified="false" tag="blue winged kookaburra" shortcut="N"> Not Blue Winged Kookaburra </oe-decision>
<oe-decision tag="blue winged kookaburra" shortcut="U" unsure> Blue Winged Kookaburra </oe-decision>
<oe-decision shortcut="S" skip>Skip</oe-decision>
```

## Use case 4: BirdNet verification

### Data

```jsonc
[]
```

### HTML

```html
<!-- This the default case -->
<oe-decision verified="true" tag="*" shortcut="Y">Positive</oe-decision>
<oe-decision verified="false" tag="*" shortcut="N">Negative</oe-decision>

<!-- This still has meaning -->
<oe-decision shortcut="S" skip>Skip</oe-decision>

<!-- We're not sure what this is used for, but we have to code for the case, even if it is an error -->
<oe-decision verified="true" tag="koala" shortcut="K">Koala</oe-decision>
<oe-decision verified="false" tag="koala" shortcut="L">Noisy Miner</oe-decision>
```

## Use case 5: Dani

### Data

```jsonc
[
  {
    "subject": "A",
    "decisions": [
      {
        "type": "verification",
        "tag": "noisy-miner",
        "confirmed": "TRUE"
      },
      {
        "type": "classification",
        "tag": "female",
        "confirmed": "TRUE"
      }
    ]
  },
  {
    "subject": "B",
    "decisions": [
      {
        "type": "verification",
        "tag": "noisy-miner",
        "confirmed": "TRUE"
      },
      {
        "type": "classification",
        "tag": "male",
        "confirmed": "TRUE"
      }
    ]
  }
]
```

### HTML

```html
<oe-decision verified="true" tag="noisy-miner" additional-tags="female" shortcut="H">Noisy Miner</oe-decision>
<oe-decision verified="true" tag="noisy-miner" additional-tags="male" shortcut="J">Noisy Miner</oe-decision>
<oe-decision verified="true" tag="noisy-miner" additional-tags="fledgling" shortcut="K">Noisy Miner</oe-decision>
<oe-decision verified="true" tag="noisy-miner" additional-tags="in-flight" shortcut="L">Noisy Miner</oe-decision>
<oe-decision verified="false" tag="noisy-miner" shortcut="N">Negative</oe-decision>

<!-- What does this mean? -->
<oe-decision verified="false" tag="*" shortcut="N" all>Negative</oe-decision>
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
        "confirmed": "TRUE"
      }
    ]
  },
  {
    "subject": "B",
    "decisions": [
      {
        "tag": "noisy-miner",
        "confirmed": "TRUE"
      },
      {
        "tag": "rain"
      }
    ]
  }
]
```

### HTML

```html
<!-- This the default case -->
<oe-decision verified="true" tag="*" shortcut="Y">Positive</oe-decision>
<oe-decision verified="false" tag="*" shortcut="N">Negative</oe-decision>

<oe-decision verified="true" tag="*" shortcut="U" additional-tags="rain">Positive</oe-decision>
<oe-decision verified="false" tag="*" shortcut="M" additional-tags="rain">Negative</oe-decision>

<!-- This still has meaning -->
<oe-decision shortcut="S" skip>Skip</oe-decision>
```
