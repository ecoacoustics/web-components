// TODO: Improve this typing to ensure that the char is at most 1 in length
type Char = string;

const nonAlphaTranslation = {
  "1": "!",
  "2": "@",
  "3": "#",
  "4": "$",
  "5": "%",
  "6": "^",
  "7": "&",
  "8": "*",
  "9": "(",
  "0": ")",
} as const satisfies Record<string, string>;

/**
 * @description
 * Converts a key into it's key + shift modifier equivalent.
 * This is useful for creating keyboard shortcuts.
 */
export function withShiftModifier<T extends Char>(key: T) {
  if (!hasTranslationEquivalent(key)) {
    console.error("Failed to determine shift modifier equivalent for key:", key);
    return null;
  }

  return nonAlphaTranslation[key];
}

function hasTranslationEquivalent(key: string): key is keyof typeof nonAlphaTranslation {
  return key in nonAlphaTranslation;
}
