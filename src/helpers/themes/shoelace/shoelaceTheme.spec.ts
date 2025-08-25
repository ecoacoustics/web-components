import { test, expect } from "../../../tests/assertions";
import { shoelaceTheming } from "../shoelace/shoelaceTheme";

function assertVariableExists(styles: string, variable: string): void {
  // We assert that the variable followed by a column exists to assert that
  // the variable declaration exists, not the usage.
  // If we did not append the column to the variable, this assertion would pass
  // if the variable was meerly used.
  expect(styles).toContain(variable + ":");
}

function createIntensities(variable: string): string[] {
  const possibleIntensities = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  return possibleIntensities.map((intensity) => `${variable}-${intensity}`);
}

test("should create", () => {
  expect(shoelaceTheming).toBeTruthy();
});

test("should pass through --oe- css theming variables through to shoelace", () => {
  const themeingCss = shoelaceTheming.cssText;

  const expectedVariables = [
    ...createIntensities("--sl-color-primary"),
    ...createIntensities("--sl-color-success"),
    ...createIntensities("--sl-color-warning"),
    ...createIntensities("--sl-color-danger"),
  ];

  for (const variable of expectedVariables) {
    assertVariableExists(themeingCss, variable);
  }
});

test("should have black and white intensities for neutral colors", () => {
  const themeingCss = shoelaceTheming.cssText;

  // These 0 and 1,000 intensities of color variants only exist for the neutral
  // color. These intensities are used by shoelace as font and background
  // colors.
  assertVariableExists(themeingCss, "--sl-color-neutral-0");
  assertVariableExists(themeingCss, "--sl-color-neutral-1000");
});
