import { expect } from "../../../tests/assertions";
import { invokeBrowserMethod } from "../../../tests/helpers";
import { chromeProviderFixture as test } from "./chromeProvider.fixture";

// most ChromeProvider functionality is tested inside the ChromeHost tests
test.beforeEach(async ({ fixture }) => {
  await fixture.create();
});

test("should create", async ({ fixture }) => {
  expect(fixture.component()).toBeDefined();
});

test("should render slotted elements without modification", async ({ fixture }) => {
  const content = "<div id='test'>Test</div>";
  await fixture.create(content);

  const childElements = await invokeBrowserMethod<HTMLSlotElement>(fixture.componentSlot(), "assignedElements");
  expect(childElements).toHaveLength(1);
});
