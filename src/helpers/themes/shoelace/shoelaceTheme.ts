import { css, CSSResult, unsafeCSS } from "lit";
import { ThemingVariable } from "../../types/advancedTypes";
import lightTheme from "@shoelace-style/shoelace/dist/themes/light.styles.js";

type ThemeToken = "primary" | "success" | "warning" | "danger" /* | "neutral" */;

/**
 * Maps shoelace color token intervals to a luminance level found in
 * https://codepen.io/claviska/pen/QWveRgL
 *
 * @see https://shoelace.style/tokens/color
 */
const intensityLuminanceMapping = {
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
} as const satisfies Record<number, number>;

const fontSizeMapping = {
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
} as const satisfies Record<string, number>;

function illuminate(backingVariable: ThemingVariable, scalar: number) {
  // This somewhat simple calculation has a lot of assumptions.
  // 1. The backing variable should be the "main" color of most UI elements such
  //    as buttons, sliders, dropdowns, etc...
  // 2. the "600" value is the "main" color used in the majority of shoelace UI
  //    elements. (e.g. the background color of buttons)
  // 3. When we are using the "600" intensity of the color, we want to pass
  //    through the color unchanged.
  const defaultValue = intensityLuminanceMapping[600];
  const defaultDelta = defaultValue - scalar + 0.5;

  const luminance = `${defaultDelta * 100}%`;

  return `hsl(from var(${backingVariable}) h s ${luminance})`;
}

function createColorVariant<Variant extends ThemeToken>(variant: Variant, backingVariable: ThemingVariable) {
  let result = "";
  for (const [size, luminanceScalar] of Object.entries(intensityLuminanceMapping)) {
    const illuminatedColor = illuminate(backingVariable, luminanceScalar);
    result += `--sl-color-${variant}-${size}: ${illuminatedColor};`;
  }

  return result;
}

/**
 * Generates shoelace variable overrides for each theming color variant and
 * intensity to match the variables set in theming.css or set through --oe-*
 * css variables.
 */
function createColorOverrides(): string {
  const populatedVariants = {
    primary: "--oe-primary-color",
    success: "--oe-success-color",
    warning: "--oe-warning-color",
    danger: "--oe-danger-color",
  } as const satisfies Record<ThemeToken, ThemingVariable>;

  let result = "";
  for (const [variant, backingValue] of Object.entries(populatedVariants)) {
    result += createColorVariant(variant as ThemeToken, backingValue);
  }

  return result;
}

function createFontOverrides(): string {
  let result = "";
  for (const [size, scalar] of Object.entries(fontSizeMapping)) {
    result += `--sl-font-size-${size}: calc(var(--oe-font-size-large) * ${scalar});`;
  }

  return result;
}

function themeOverrides(): CSSResult {
  const staticOverrides = `
    --sl-font-sans: var(--oe-font-family);

    /**
     * These "0" and "1000" intensities only exist on the neutral variant.
     * They are used as "black" and "white" variables, and are typically used
     * for background / foreground.
     * https://shoelace.style/tokens/color#theme-tokens
     */
    --sl-color-neutral-0: var(--oe-background-color);
    --sl-color-neutral-1000: var(--oe-font-color);
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
