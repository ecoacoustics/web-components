import { css, CSSResult, unsafeCSS } from "lit";
import { CssVariable } from "../../types/advancedTypes";
import lightTheme from "@shoelace-style/shoelace/dist/themes/light.styles.js";

type ThemeScale = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;
const themeScaleMapping = {
  50: 0.95,
  100: 0.84,
  200: 0.73,
  300: 0.62,
  400: 0.49,
  500: 0.35,
  // "600" is the default for buttons and UI elements.
  600: 0.23,
  700: 0.15,
  800: 0.1,
  900: 0.05,
  950: 0.02,
} as const satisfies Record<ThemeScale, number>;

type FontSize =
  | "2x-small"
  | "x-small"
  | "small"
  | "medium"
  | "large"
  | "x-large"
  | "2x-large"
  | "3x-large"
  | "4x-large";

const fontMapping = {
  "4x-large": 1.6,
  "3x-large": 1.5,
  "2x-large": 1.4,
  "x-large": 1.3,
  large: 1.2,
  medium: 1.1,
  // "small" font size is the default buttons and inputs
  small: 1.0,
  "x-small": 0.8,
  "2x-small": 0.7,
} as const satisfies Record<FontSize, number>;

type ThemeTokens = "primary" | "success" | "warning" | "danger" /* | "neutral" */;

/** A theming variable from our theming.css file */
type ThemingVariable<T extends string = ""> = CssVariable<`oe-${T}`>;

function createFontOverrides(): string {
  let result = "";
  for (const [size, scalar] of Object.entries(fontMapping)) {
    result += `--sl-font-size-${size}: calc(var(--oe-font-size-large) * ${scalar});`;
  }

  return result;
}

function illuminate(input: string, scalar: number) {
  const defaultValue = themeScaleMapping[600];
  const defaultDelta = defaultValue - scalar + 0.5;

  const luminance = `${defaultDelta * 100}%`;

  return `hsl(from ${input} h s ${luminance})`;
}

function createColorVariant<Variant extends ThemeTokens, Variable extends ThemingVariable<T>, T extends string>(
  variant: Variant,
  backingTheme: Variable,
) {
  let result = "";
  for (const [size, luminanceScalar] of Object.entries(themeScaleMapping)) {
    const illuminatedColor = illuminate(`var(${backingTheme})`, luminanceScalar);
    result += `--sl-color-${variant}-${size}: ${illuminatedColor};`;
  }

  return result;
}

/**
 * Generates color variants are generated according to the color token generator
 * provided by Shoelace.
 *
 * https://codepen.io/claviska/pen/QWveRgL
 */
function createColorOverrides(): string {
  const populatedVariants = {
    primary: "--oe-primary-color",
    success: "--oe-success-color",
    warning: "--oe-warning-color",
    danger: "--oe-danger-color",
  } as const satisfies Record<ThemeTokens, ThemingVariable<string>>;

  let result = "";
  for (const [variant, backingValue] of Object.entries(populatedVariants)) {
    result += createColorVariant(variant as any, backingValue);
  }

  return result;
}

function themeOverrides(): CSSResult {
  const staticOverrides = `
    --sl-font-sans: var(--oe-font-family);
  `;

  const fontOverrides = createFontOverrides();
  const colorOverrides = createColorOverrides();

  const source = `
    :root,
    :host {
      ${unsafeCSS(staticOverrides)}
      ${unsafeCSS(fontOverrides)}
      ${unsafeCSS(colorOverrides)}
    }
  `;

  return unsafeCSS(source);
}

function createShoelaceTheming(): CSSResult {
  return css`
    ${lightTheme}
    ${themeOverrides()}
  `;
}

export const shoelaceTheming = createShoelaceTheming();
