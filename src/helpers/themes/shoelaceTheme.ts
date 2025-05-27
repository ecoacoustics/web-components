import { css, CSSResult } from "lit";
import lightTheme from "@shoelace-style/shoelace/dist/themes/light.styles.js";

type PossibleVariants = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;

type ThemingVariable = `--oe-${string}` | string;
type ColorVariable<ColorName extends string, Variant extends PossibleVariants> = `--sl-${ColorName}-${Variant}`;

type ColorVariants<ColorName extends string> = {
  [Variant in PossibleVariants]: ColorVariable<ColorName, Variant>;
};

function createVariants<ColorName extends string>(
  color: string,
  backingTheme: ThemingVariable = color,
): ColorVariants<ColorName> {
  return {};
}

function themeOverrides(): CSSResult {
  const result = "";

  const populatedVariants = {
    primary: "var(--oe-primary-color)",
    success: "var(--oe-success-color)",
    warning: "var(--oe-warning-color)",
    danger: "var(--oe-danger-color)",
    neutral: "var(--oe-panel-color)",
  };

  return css``;
}

function createVariantTheming(): CSSResult {
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
export const shoelaceTheming = createVariantTheming();
