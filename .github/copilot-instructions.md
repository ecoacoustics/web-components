# Coding Agent Style Guide

This document describes the coding conventions for the `ecoacoustics/web-components`
repository. All agents and contributors should follow these rules.

---

## General TypeScript rules

### Always use braces on `if`/`else`/`for`/`while` blocks

Even single-statement bodies must be wrapped in braces:

```ts
// ✅ correct
if (value === null) {
  return undefined;
}

// ❌ incorrect – omits braces
if (value === null) return undefined;
```

### Never abbreviate variable names

Use full, descriptive names. Single-letter names are only acceptable for
well-known coordinate variables (`x`, `y`, `i`, `j`) or where the surrounding
context makes the meaning unambiguous (e.g. lambda parameters in very short
arrow functions).

```ts
// ✅ correct
const parsedNumber = Number(value);

// ❌ incorrect – abbreviated
const num = Number(value);
```

### Access modifiers on every class member

Every class property and method must have an explicit access modifier
(`public`, `private`, or `protected`) and `readonly` where appropriate:

```ts
// ✅ correct
public startOffset: Seconds;
private readonly cachedResult: string;

// ❌ incorrect – implicit public
startOffset: Seconds;
```

### Null vs. undefined semantics

`null` and `undefined` are distinct concepts and must not be collapsed into one:

| Value | Meaning |
|---|---|
| `undefined` | Attribute was absent — the property was never set |
| `null` | Attribute was explicitly set to an empty or null value (`attr=""` or `attr="null"`) |
| `number` | A valid numeric value was provided |

Use `== null` (loose equality) when you need to check for *either* `null` or
`undefined` (i.e. "missing for any reason"):

```ts
// ✅ checks for both null and undefined
if (annotation.endOffset == null) { ... }

// ✅ same when asserting presence
if (annotation.lowFrequency != null) { ... }

// ❌ misses null when checking for undefined only
if (annotation.endOffset === undefined) { ... }
```

Use strict equality (`===`) only when the distinction between `null` and
`undefined` matters (e.g. inside a converter that must return different things
for each).

---

## Attribute converters

Use `nullableNumberConverter` from `src/helpers/attributes.ts` for any optional
numeric Lit property. It enforces the null/undefined distinction above:

- Absent attribute (Lit passes `null` to `fromAttribute`) → `undefined`
- Empty string `""` or the string `"null"` → `null`
- Valid numeric string → `number`
- Invalid non-empty string → throws an `Error`

`toAttribute` mirrors this:
- `undefined` → removes the attribute from the DOM entirely
- `null` → sets the attribute to `""`
- `number` → serialises to a numeric string

---

## Formatting (enforced by Prettier + EditorConfig)

| Setting | Value |
|---|---|
| Indent | 2 spaces |
| Line endings | LF |
| Print width | 120 characters |
| Quotes | Double (`"`) |
| Semicolons | Required |
| Trailing commas | All |

Run `pnpm exec prettier --write <file>` to auto-format a file.

---

## Linting

Run `pnpm exec eslint src/` to lint the source. Key enforced rules:

- `@typescript-eslint/strict-type-checked` — strict TypeScript checks
- `no-console` — only `console.warn`, `console.error`, `console.time`,
  `console.timeEnd`, and `console.debug` are allowed; `console.log` is banned

---

## Build and test

```sh
# Run all model/unit tests (fast, no browser needed)
pnpm exec playwright test src/models/ --project=chromium

# Run all component tests (requires browser)
pnpm exec playwright test src/components/ --project=chromium

# Full test suite
pnpm test

# TypeScript type-check (source)
pnpm exec tsc --noEmit --project tsconfig.json

# TypeScript type-check (including spec/fixture files)
pnpm exec tsc --noEmit --project tsconfig.spec.json

# Build
pnpm build
```

---

## Documentation comments

Public API surface (exported functions, classes, and their public members)
must have JSDoc comments. Use `/** */` blocks, not `/* */` or `//`:

```ts
/**
 * Converts an attribute value string to a number, null, or undefined.
 *
 * @param value - The raw attribute string received from Lit.
 */
export function parseNumber(value: string | null): number | null | undefined { ... }
```

---

## Web component conventions

- Custom elements are registered with the `@customElement` decorator from
  `src/helpers/customElement.ts` (not from `lit/decorators.js`).
- Lit `@property` declarations use typed `converter` objects (not bare `type:`)
  for any attribute that can be absent, null, or an enum.
- Reactive state that is shared across components uses
  `@lit-labs/preact-signals` (`signal`, `computed`, `ReadonlySignal`).
