import { css, CSSResult, unsafeCSS } from "lit";
import { CssVariable } from "../../types/advancedTypes";
import lightTheme from "@shoelace-style/shoelace/dist/themes/light.styles.js";

const themeSizes = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

type ThemeSizes = (typeof themeSizes)[number];
type ThemeTokens = "primary" | "success" | "warning" | "danger" | "neutral";
type SizeVariants = "small" | "medium" | "large";
type SizeVariantsExtended = SizeVariants | "2x-small" | "x-small" | "x-large" | "2x-large" | "3x-large" | "4x-large";

/** A theming variable from our theming.css file */
type ThemingVariable<T extends string = ""> = CssVariable<`oe-${T}`>;
type ShoelaceVariable<T extends string = ""> = CssVariable<`sl-${T}`>;

/** A shoelace theming color variable */
type ColorVariable<
  ColorName extends ThemeTokens,
  Variant extends ThemeSizes,
> = ShoelaceVariable<`${ColorName}-${Variant}`>;

type FontVariable<Variant extends SizeVariantsExtended> = ShoelaceVariable<`font-${Variant}`>;

function createFontOverrides(): string {
  const result = "";

  return ``;
}

function createColorVariant<Variant extends ThemeTokens, Variable extends ThemingVariable<T>, T extends string>(
  variant: Variant,
  backingTheme: Variable,
) {
  let result = "";
  for (const size of themeSizes) {
    result += `--sl-color-${variant}-${size}: var(${backingTheme});`;
  }

  return result;
}

function createColorOverrides(): string {
  const populatedVariants = {
    primary: "--oe-primary-color",
    success: "--oe-success-color",
    warning: "--oe-warning-color",
    danger: "--oe-danger-color",
    neutral: "--oe-panel-color",
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

  console.debug(source);

  return unsafeCSS(source);
}

function createShoelaceTheming(): CSSResult {
  return css`
    ${lightTheme}
    ${themeOverrides()}
  `;
}

/**
 * We declare the shoelace theming inside the "globalStyles" so that shoelace
 * theming variables are scoped to our web component's shadow root.
 * This is the same reason why our shoelace theming overrides are injected into
 * the component's shadow root.
 */
export const shoelaceTheming = createShoelaceTheming();
