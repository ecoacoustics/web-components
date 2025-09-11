import { expect, test } from "../../tests/assertions";

const withListenerTestId = "with-listener";
const noListenerTestId = "no-listener";

test.beforeEach(async ({ page }) => {
  await page.setContent(`
    <button data-testid="${withListenerTestId}">Click Me</button>
    <button data-testid="${noListenerTestId}">No Action Button</button>

    <script type="module">
      document.querySelector('[data-testid="with-listener"]').addEventListener('click', () => {
        console.log('Button clicked');
      });
    </script>
  `);
});

test("should add an identifier to the window.__oe_patched_methods property", async ({ page }) => {
  const expectedPatches = ["__oe_patch_EventTarget.addEventListener"];
  const realizedPatches = await page.evaluate(() => {
    return [...window["__oe_patched_methods"]];
  });

  expect(realizedPatches).toEqual(expectedPatches);
});

test("should keep track of click events add to elements", async ({ page }) => {
  const buttonWithListener = page.getByTestId(withListenerTestId);
  const buttonWithoutListener = page.getByTestId(noListenerTestId);

  await expect(buttonWithListener).toHaveJSProperty("__oe_event_listeners", new Set(["click"]));
  await expect(buttonWithoutListener).not.toHaveJSProperty("__oe_event_listeners", false);
});
