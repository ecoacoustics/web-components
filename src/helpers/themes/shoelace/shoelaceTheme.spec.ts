import { test, expect } from "../../../tests/assertions";
import { shoelaceTheming } from "../shoelace/shoelaceTheme";

function assertVariableExists(styles: string, variable: string) {
  expect(styles).toContain(variable);
}

function createIntensities(variable: string): string[] {
  const possibleIntensities = [50,100,200,300,400,500,600,700,800,900,950];
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
});
