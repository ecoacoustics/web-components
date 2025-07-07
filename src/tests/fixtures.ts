import { Page } from "@playwright/test";
import { test } from "./assertions";

interface TestFixture {
  page: Page;
}

type FixtureConstructor<T extends TestFixture> = new (page: Page) => T;

export function createFixture<T extends TestFixture>(fixtureConstructor: FixtureConstructor<T>) {
  return test.extend<{ fixture: T }>({
    fixture: async ({ page }, run) => {
      const fixture = new fixtureConstructor(page);
      await run(fixture);
    },
  });
}
