import { verificationGridFixture as test } from "./verification-grid.e2e.fixture";
import { expect } from "../assertions";
import { VerificationGridComponent } from "../../components/verification-grid/verification-grid";
import { emptyDataset } from "./verification-grid.e2e.datasets";
import { setContent } from "../fixtures";
import { getEventLogs, logEvent } from "../helpers/helpers";

test.describe("subjects-exhausted templates", () => {
  const customTemplate = `
    <oe-verification verified="true" shortcut="Y"></oe-verification>
    <template slot="subjects-exhausted">
      <h2>Thanks for reviewing these recordings!</h2>
      <p>You can close this page now.</p>
    </template>
  `;

  test("should show the verified count from the grid in the completion content", async ({ fixture }) => {
    await fixture.page.addInitScript(() => {
      localStorage.setItem("oe-auto-dismiss-bootstrap", "true");
    });
    await fixture.page.route("**/subjects-exhausted-test.html", async (route) => {
      await route.fulfill({
        contentType: "text/html",
        headers: {
          "Cross-Origin-Opener-Policy": "same-origin",
          "Cross-Origin-Embedder-Policy": "require-corp",
        },
        body: `
          <!doctype html>
          <script type="module" src="/src/index.ts"></script>
          <oe-verification-grid id="verification-grid">
            <oe-verification verified="true"></oe-verification>
            <template slot="subjects-exhausted">
              <p>You verified <span class="verified-count"></span> recordings.</p>
              <script>
                queueMicrotask(() => {
                  const grid = document.getElementById("verification-grid");
                  grid.shadowRoot.querySelector(".verified-count").textContent = grid.decisionHeadIndex;
                });
              </script>
            </template>
            <oe-data-source slot="data-source" for="verification-grid" src="${fixture.smallJsonInput}"></oe-data-source>
          </oe-verification-grid>
        `,
      });
    });
    await fixture.page.goto("http://localhost:3000/subjects-exhausted-test.html");
    await expect(fixture.gridComponent()).toHaveJSProperty("loadState", "loaded");
    await expect(fixture.gridComponent().locator(".verified-count")).toHaveCount(0);

    await fixture.makeVerificationDecision("true");
    await expect(fixture.messageOverlay()).toHaveText("You verified 3 recordings.");
  });

  test("should reset the verified count when switching a partially reviewed grid to an empty source", async ({
    fixture,
  }) => {
    const countTemplate = `
      <oe-verification verified="true"></oe-verification>
      <oe-verification verified="false"></oe-verification>
      <template slot="subjects-exhausted">
        <p>You verified <span class="verified-count"></span> recordings.</p>
        <script>
          queueMicrotask(() => {
            const grid = document.getElementById("verification-grid");
            grid.shadowRoot.querySelector(".verified-count").textContent = grid.decisionHeadIndex;
          });
        </script>
      </template>
    `;
    await fixture.create(countTemplate, [], fixture.smallJsonInput);

    await fixture.changeGridSize(1);
    await expect(fixture.gridTileComponents()).toHaveCount(1);
    await fixture.makeVerificationDecision("true");
    await expect.poll(() => fixture.getVerificationHead()).toBeGreaterThan(0);
    const decisionHeadIndex = await fixture.getVerificationHead();
    expect(decisionHeadIndex).toBeLessThan(3);

    await fixture.gridComponent().evaluate((grid: VerificationGridComponent) => {
      grid.getPage = () => Promise.resolve({ subjects: [], context: {}, totalItems: 0 });
    });
    await expect(fixture.messageOverlay()).toHaveText("You verified 0 recordings.");
  });

  test.describe("exhausted datasets", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.create(customTemplate, [], fixture.smallJsonInput);
    });

    for (const completionContent of ["custom", "default"]) {
      test(`should hide and disable decision controls with ${completionContent} completion content`, async ({
        fixture,
      }) => {
        if (completionContent === "default") {
          await fixture
            .gridComponent()
            .locator('template[slot="subjects-exhausted"]')
            .evaluate((template) => {
              template.remove();
            });
        }

        const decisionControls = fixture.gridComponent().locator(".decision-controls");
        const prompt = fixture.gridComponent().locator(".verification-controls-title");
        await expect(decisionControls).toBeVisible();
        await fixture.makeVerificationDecision("true");
        await expect(fixture.messageOverlay()).toBeVisible();
        await expect(fixture.gridTileComponents()).toHaveCount(0);
        await expect(decisionControls).toBeHidden();
        await expect(prompt).toBeHidden();
        await expect(fixture.verificationButton("true")).toBeHidden();
        await expect(fixture.skipButton()).toBeHidden();
        await expect(fixture.gridComponent().locator("oe-verification")).toHaveJSProperty("disabled", true);
        await expect(fixture.gridComponent().locator("oe-skip")).toHaveJSProperty("disabled", true);

        await logEvent(fixture.page, "decision-made");
        await fixture.gridComponent().press("Y");
        await fixture.gridComponent().press("s");
        expect(await getEventLogs(fixture.page, "decision-made")).toHaveLength(0);
        await expect(fixture.gridComponent()).toHaveJSProperty("decisionHeadIndex", 3);

        await fixture.viewPreviousHistoryPage();
        await expect(fixture.gridComponent()).toHaveJSProperty("loadState", "loaded");
        await expect(decisionControls).toBeVisible();
        await expect(prompt).toBeVisible();
        await expect(fixture.verificationButton("true")).toBeVisible();
        await expect(fixture.gridComponent().locator("oe-verification")).toHaveJSProperty("disabled", false);
        await expect(fixture.gridComponent().locator("oe-skip")).toHaveJSProperty("disabled", false);
      });
    }

    test("should show custom content only after the last subjects are reviewed", async ({ fixture }) => {
      await expect(fixture.gridTileComponents()).toHaveCount(3);
      await expect(fixture.page.getByRole("heading", { name: "Thanks for reviewing these recordings!" })).toHaveCount(
        0,
      );
      await expect(fixture.gridComponent().locator('slot[name="subjects-exhausted"]')).toHaveCount(0);

      await fixture.makeVerificationDecision("true");
      await expect(fixture.messageOverlay()).toHaveText(
        "Thanks for reviewing these recordings! You can close this page now.",
      );
      await expect(fixture.page.getByText("No un-validated results found")).toBeHidden();
      await expect(fixture.gridTileComponents()).toHaveCount(0);

      await fixture.viewPreviousHistoryPage();
      await expect(fixture.gridTileComponents()).toHaveCount(3);
      await expect(fixture.page.getByRole("heading", { name: "Thanks for reviewing these recordings!" })).toHaveCount(
        0,
      );
      await expect(fixture.gridComponent().locator('slot[name="subjects-exhausted"]')).toHaveCount(0);
    });

    test("should preserve the default completion message and validated count", async ({ fixture }) => {
      await fixture
        .gridComponent()
        .locator('template[slot="subjects-exhausted"]')
        .evaluate((template) => {
          template.remove();
        });
      await fixture.makeVerificationDecision("true");
      await expect(fixture.messageOverlay()).toHaveText(
        "No un-validated results found All 3 annotations are validated",
      );
    });
  });

  test.describe("without subjects", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.setNoBootstrap();
      await setContent(fixture.page, `<oe-verification-grid>${customTemplate}</oe-verification-grid>`);
    });

    test("should hide live children assigned to the subjects-exhausted slot", async ({ fixture }) => {
      await fixture.gridComponent().evaluate((grid: VerificationGridComponent) => {
        const liveNotification = document.createElement("div");
        liveNotification.slot = "subjects-exhausted";
        liveNotification.textContent = "Live notification content";
        grid.appendChild(liveNotification);
        grid.getPage = () => Promise.resolve({ subjects: [], context: {}, totalItems: 0 });
      });

      await expect(fixture.messageOverlay()).toHaveText(
        "Thanks for reviewing these recordings! You can close this page now.",
      );
      await expect(fixture.gridComponent().locator('slot[name="subjects-exhausted"]')).toBeHidden();
    });

    test("should show custom content for an initially empty dataset", async ({ fixture }) => {
      await fixture.gridComponent().evaluate((grid: VerificationGridComponent) => {
        grid.getPage = () => Promise.resolve({ subjects: [], context: {}, totalItems: 0 });
      });
      await expect(fixture.messageOverlay()).toHaveText(
        "Thanks for reviewing these recordings! You can close this page now.",
      );
      await expect(fixture.page.getByText("No un-validated results found")).toBeHidden();
      await expect(fixture.gridComponent().locator(".decision-controls")).toBeHidden();
      await expect(fixture.gridComponent().locator("oe-verification")).toHaveJSProperty("disabled", true);
      await expect(fixture.gridComponent().locator("oe-skip")).toHaveJSProperty("disabled", true);
    });

    test("should restore the default message when the subjects-exhausted template is removed", async ({ fixture }) => {
      await fixture.gridComponent().evaluate((grid: VerificationGridComponent) => {
        grid.getPage = () => Promise.resolve({ subjects: [], context: {}, totalItems: 0 });
      });
      await expect(fixture.page.getByRole("heading", { name: "Thanks for reviewing these recordings!" })).toBeVisible();

      await fixture
        .gridComponent()
        .locator('template[slot="subjects-exhausted"]')
        .evaluate((template) => {
          template.remove();
        });
      await expect(fixture.messageOverlay()).toHaveText(
        "No un-validated results found All 0 annotations are validated",
      );
    });

    test("should use the default message for an empty dataset without a template", async ({ fixture }) => {
      await setContent(
        fixture.page,
        `<oe-verification-grid><oe-verification verified="true"></oe-verification></oe-verification-grid>`,
      );
      await fixture.gridComponent().evaluate((grid: VerificationGridComponent) => {
        grid.getPage = () => Promise.resolve({ subjects: [], context: {}, totalItems: 0 });
      });
      await expect(fixture.messageOverlay()).toHaveText(
        "No un-validated results found All 0 annotations are validated",
      );
      await expect(fixture.gridComponent().locator(".decision-controls")).toBeHidden();
      await expect(fixture.gridComponent().locator("oe-verification")).toHaveJSProperty("disabled", true);
      await expect(fixture.gridComponent().locator("oe-skip")).toHaveJSProperty("disabled", true);
    });

    test("should not show custom content while subjects are loading", async ({ fixture }) => {
      await expect(fixture.gridComponent()).toHaveJSProperty("loadState", "dataset-fetching");
      await expect(fixture.messageOverlay()).toContainText("Loading");
      await expect(fixture.page.getByRole("heading", { name: "Thanks for reviewing these recordings!" })).toHaveCount(
        0,
      );
      await expect(fixture.gridComponent().locator('slot[name="subjects-exhausted"]')).toHaveCount(0);
    });

    test("should not show custom content while tiles are loading", async ({ fixture }) => {
      // Gate only the audio fetch to avoid suspected WebKit blob-worker
      // loading failures caused by browser-wide request interception.
      const releaseAudioFetch = await fixture.page.evaluateHandle(() => {
        const originalFetch = window.fetch;
        let release!: () => void;
        const audioFetchGate = new Promise<void>((resolve) => {
          release = resolve;
        });

        window.fetch = async (input, options) => {
          const url = input instanceof Request ? input.url : input.toString();
          if (new URL(url, document.baseURI).pathname === "/example.flac") {
            await audioFetchGate;
          }

          return originalFetch.call(window, input, options);
        };

        return () => {
          window.fetch = originalFetch;
          release();
        };
      });

      try {
        await setContent(
          fixture.page,
          `<oe-verification-grid id="verification-grid">
            ${customTemplate}
            <oe-data-source slot="data-source" for="verification-grid" src="${fixture.smallJsonInput}"></oe-data-source>
          </oe-verification-grid>`,
        );
        await expect(fixture.gridComponent()).toHaveJSProperty("loadState", "tiles-loading");
        await expect(fixture.gridTileComponents()).toHaveCount(3);
        await expect(fixture.page.getByRole("heading", { name: "Thanks for reviewing these recordings!" })).toHaveCount(
          0,
        );
        await expect(fixture.gridComponent().locator('slot[name="subjects-exhausted"]')).toHaveCount(0);
      } finally {
        await releaseAudioFetch.evaluate((release) => {
          release();
        });
        await releaseAudioFetch.dispose();
      }

      await expect(fixture.gridComponent()).toHaveJSProperty("loadState", "loaded");
    });

    test("should not show custom content when the grid shows an error", async ({ fixture }) => {
      await fixture.gridComponent().evaluate((grid: VerificationGridComponent) => {
        grid.transitionError();
      });
      await expect(fixture.messageOverlay()).toHaveText("Failed to load data source");
      await expect(fixture.page.getByRole("heading", { name: "Thanks for reviewing these recordings!" })).toHaveCount(
        0,
      );
      await expect(fixture.gridComponent().locator('slot[name="subjects-exhausted"]')).toHaveCount(0);
    });
  });
});

test.describe.fixme("empty datasets", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.createWithVerificationTask();
    await fixture.changeGridSource(emptyDataset);
  });

  // An empty dataset should not be treated as an error, and should therefore
  // act as if the user has reached the end of the dataset.
  test("should show 'no items to validate' message", async ({ fixture }) => {
    await expect(fixture.messageOverlay()).toHaveTrimmedText([
      "No un-validated results found",
      "All 0 annotations are validated",
    ]);
  });

  test("should have disabled paging controls", async ({ fixture }) => {
    await expect(fixture.nextPageButton()).toBeDisabled();
    await expect(fixture.previousPageButton()).toBeDisabled();
    await expect(fixture.continueVerifyingButton()).toBeHidden();
  });
});
