import { verificationGridFixture as test } from "./verification-grid.e2e.fixture";
import { expect } from "../assertions";
import { VerificationGridComponent } from "../../components/verification-grid/verification-grid";
import { emptyDataset } from "./verification-grid.e2e.datasets";
import { setContent } from "../fixtures";
import { getEventLogs, logEvent } from "../helpers/helpers";
import { IPageFetcherResponse } from "../../services/gridPageFetcher/gridPageFetcher";

test.describe("subjects-exhausted slot", () => {
  const customContent = `
    <oe-verification verified="true"></oe-verification>
    <div slot="subjects-exhausted">
      <h2>Thanks for reviewing these recordings!</h2>
      <p>You can close this page now.</p>
    </div>
  `;
  const countContent = `
    <oe-verification verified="true"></oe-verification>
    <oe-verification verified="false"></oe-verification>
    <div slot="subjects-exhausted">
      <p>You verified <span class="verified-count"></span> recordings.</p>
    </div>
    <script type="module">
      await customElements.whenDefined("oe-verification-grid");
      const grid = document.getElementById("verification-grid");
      await grid.updateComplete;

      const updateCount = () => {
        grid.querySelector(".verified-count").textContent = grid.decisionHeadIndex;
      };
      grid.addEventListener("subjects-exhausted", updateCount);
      updateCount();
    </script>
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
            ${countContent}
            <oe-data-source slot="data-source" for="verification-grid" src="${fixture.smallJsonInput}"></oe-data-source>
          </oe-verification-grid>
        `,
      });
    });
    await fixture.page.goto("http://localhost:3000/subjects-exhausted-test.html");
    await expect(fixture.gridComponent()).toHaveJSProperty("loadState", "loaded");
    await expect(fixture.gridComponent().locator(".verified-count")).toBeHidden();

    await fixture.makeVerificationDecision("true");
    await expect(fixture.page.getByText("You verified 3 recordings.", { exact: true })).toBeVisible();
  });

  test("should reset the verified count when switching a partially reviewed grid to an empty source", async ({
    fixture,
  }) => {
    await fixture.create(countContent, [], fixture.smallJsonInput);

    await fixture.changeGridSize(1);
    await expect(fixture.gridTileComponents()).toHaveCount(1);
    await fixture.makeVerificationDecision("true");
    await expect.poll(() => fixture.getVerificationHead()).toBeGreaterThan(0);
    const decisionHeadIndex = await fixture.getVerificationHead();
    expect(decisionHeadIndex).toBeLessThan(3);

    await fixture.gridComponent().evaluate((grid: VerificationGridComponent) => {
      grid.getPage = () => Promise.resolve({ subjects: [], context: {}, totalItems: 0 });
    });
    await expect(fixture.page.getByText("You verified 0 recordings.", { exact: true })).toBeVisible();
  });

  test.describe("exhausted datasets", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.create(customContent, [], fixture.smallJsonInput);
    });

    for (const completionContent of ["custom", "default"]) {
      test(`should hide and disable decision controls with ${completionContent} completion content`, async ({
        fixture,
      }) => {
        if (completionContent === "default") {
          await fixture
            .gridComponent()
            .locator('[slot="subjects-exhausted"]')
            .evaluate((content) => {
              content.remove();
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

    test("should emit once per completion view with the final count and rendered slot", async ({ fixture }) => {
      const notifications = await fixture.gridComponent().evaluateHandle((grid: VerificationGridComponent) => {
        const notifications: { count: number; hasSlot: boolean }[] = [];
        grid.addEventListener("subjects-exhausted", () => {
          notifications.push({
            count: grid.decisionHeadIndex,
            hasSlot: !!grid.shadowRoot?.querySelector('slot[name="subjects-exhausted"]'),
          });
        });
        return notifications;
      });
      expect(await notifications.jsonValue()).toEqual([]);

      await fixture.makeVerificationDecision("true");
      await expect.poll(() => notifications.jsonValue()).toEqual([{ count: 3, hasSlot: true }]);
      await fixture.gridComponent().evaluate(async (grid: VerificationGridComponent) => {
        grid.requestUpdate();
        await grid.updateComplete;
      });
      expect(await notifications.jsonValue()).toEqual([{ count: 3, hasSlot: true }]);

      await fixture.viewPreviousHistoryPage();
      expect(await notifications.jsonValue()).toEqual([{ count: 3, hasSlot: true }]);
      await fixture.viewNextHistoryPage();
      await expect
        .poll(() => notifications.jsonValue())
        .toEqual([
          { count: 3, hasSlot: true },
          { count: 3, hasSlot: true },
        ]);
      await notifications.dispose();
    });

    test("should not emit for unreviewed subjects when replacing an exhausted source", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await expect(fixture.page.getByRole("heading", { name: "Thanks for reviewing these recordings!" })).toBeVisible();
      const notifications = await fixture.gridComponent().evaluateHandle((grid: VerificationGridComponent) => {
        const notifications: number[] = [];
        grid.addEventListener("subjects-exhausted", () => {
          notifications.push(grid.decisionHeadIndex);
        });
        return notifications;
      });
      await fixture.page.route("**/replacement-subjects.json", async (route) => {
        await route.fulfill({ json: [{ AudioLink: "http://localhost:3000/example.flac", Tag: "koala" }] });
      });
      await fixture.changeGridSource("http://localhost:3000/replacement-subjects.json");

      await expect(fixture.gridTileComponents()).toHaveCount(1);
      expect(await fixture.getVerificationHead()).toBe(0);
      expect(await notifications.jsonValue()).toEqual([]);

      await fixture.makeVerificationDecision("true");
      await expect.poll(() => notifications.jsonValue()).toEqual([1]);
      await notifications.dispose();
    });

    test("should show custom content only after the last subjects are reviewed", async ({ fixture }) => {
      await expect(fixture.gridTileComponents()).toHaveCount(3);
      await expect(fixture.page.getByRole("heading", { name: "Thanks for reviewing these recordings!" })).toHaveCount(
        0,
      );
      await expect(fixture.gridComponent().locator('slot[name="subjects-exhausted"]')).toHaveCount(0);

      await fixture.makeVerificationDecision("true");
      await expect(fixture.gridComponent().locator('[slot="subjects-exhausted"]')).toHaveText(
        "Thanks for reviewing these recordings! You can close this page now.",
      );
      await expect(fixture.page.getByRole("heading", { name: "Thanks for reviewing these recordings!" })).toBeVisible();
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
        .locator('[slot="subjects-exhausted"]')
        .evaluate((content) => {
          content.remove();
        });
      await fixture.makeVerificationDecision("true");
      await expect(fixture.messageOverlay()).toHaveText(
        "No un-validated results found All 3 annotations are validated",
      );
    });

    test("should preserve live content state when navigating away from exhaustion", async ({ fixture }) => {
      await fixture
        .gridComponent()
        .locator('[slot="subjects-exhausted"]')
        .evaluate((content) => {
          const input = document.createElement("input");
          input.setAttribute("aria-label", "Feedback");
          content.appendChild(input);
        });
      await fixture.makeVerificationDecision("true");
      const feedback = fixture.page.getByRole("textbox", { name: "Feedback", includeHidden: true });
      await feedback.fill("Keep this feedback");

      await fixture.viewPreviousHistoryPage();
      await expect(feedback).toBeHidden();
      await expect(feedback).toHaveValue("Keep this feedback");

      await fixture.viewNextHistoryPage();
      await expect(feedback).toBeVisible();
      await expect(feedback).toHaveValue("Keep this feedback");
    });
  });

  test.describe("without subjects", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.setNoBootstrap();
      await setContent(fixture.page, `<oe-verification-grid>${customContent}</oe-verification-grid>`);
    });

    test("should notify from the completion update without waiting for an animation frame", async ({ fixture }) => {
      const count = await fixture.gridComponent().evaluate(async (grid: VerificationGridComponent) => {
        const requestAnimationFrame = window.requestAnimationFrame;
        const pendingFrames: FrameRequestCallback[] = [];
        window.requestAnimationFrame = (callback) => pendingFrames.push(callback);
        try {
          const exhausted = new Promise<number>((resolve) => {
            grid.addEventListener(
              "subjects-exhausted",
              () => {
                resolve(grid.decisionHeadIndex);
              },
              { once: true },
            );
          });
          grid.getPage = () => Promise.resolve({ subjects: [], context: {}, totalItems: 0 });
          return await exhausted;
        } finally {
          window.requestAnimationFrame = requestAnimationFrame;
          for (const callback of pendingFrames) {
            requestAnimationFrame(callback);
          }
        }
      });
      expect(count).toBe(0);
      await expect(fixture.page.getByRole("heading", { name: "Thanks for reviewing these recordings!" })).toBeVisible();
    });

    test("should let event listeners create slot content for each empty source", async ({ fixture }) => {
      await fixture.gridComponent().evaluate((grid: VerificationGridComponent) => {
        grid.querySelector('[slot="subjects-exhausted"]')?.remove();
        let notificationCount = 0;
        grid.addEventListener("subjects-exhausted", () => {
          notificationCount++;
          let content = grid.querySelector('[slot="subjects-exhausted"]');
          if (!content) {
            content = document.createElement("div");
            content.slot = "subjects-exhausted";
            grid.appendChild(content);
          }
          content.textContent = `Completion ${notificationCount}: ${grid.decisionHeadIndex} reviewed`;
        });
        grid.getPage = () => Promise.resolve({ subjects: [], context: {}, totalItems: 0 });
      });
      await expect(fixture.page.getByText("Completion 1: 0 reviewed", { exact: true })).toBeVisible();

      await fixture.gridComponent().evaluate((grid: VerificationGridComponent) => {
        grid.getPage = () => Promise.resolve({ subjects: [], context: {}, totalItems: 0 });
      });
      await expect(fixture.page.getByText("Completion 2: 0 reviewed", { exact: true })).toBeVisible();
    });

    test("should not emit while loading or showing an error", async ({ fixture }) => {
      const notifications = await fixture.gridComponent().evaluateHandle(async (grid: VerificationGridComponent) => {
        const notifications: string[] = [];
        grid.addEventListener("subjects-exhausted", () => notifications.push("exhausted"));
        grid.requestUpdate();
        await grid.updateComplete;
        grid.transitionError();
        await grid.updateComplete;
        return notifications;
      });
      await expect(fixture.messageOverlay()).toHaveText("Failed to load data source");
      expect(await notifications.jsonValue()).toEqual([]);
      await notifications.dispose();
    });

    test("should project additional live children and their updates", async ({ fixture }) => {
      await fixture.gridComponent().evaluate((grid: VerificationGridComponent) => {
        const liveNotification = document.createElement("div");
        liveNotification.slot = "subjects-exhausted";
        liveNotification.textContent = "Live notification content";
        grid.appendChild(liveNotification);
        grid.getPage = () => Promise.resolve({ subjects: [], context: {}, totalItems: 0 });
      });

      await expect(fixture.page.getByRole("heading", { name: "Thanks for reviewing these recordings!" })).toBeVisible();
      await expect(fixture.page.getByText("Live notification content", { exact: true })).toBeVisible();
      await expect(fixture.gridComponent().locator('slot[name="subjects-exhausted"]')).toHaveCount(1);
      await fixture
        .gridComponent()
        .locator('[slot="subjects-exhausted"]')
        .last()
        .evaluate((content) => {
          content.textContent = "Updated notification content";
        });
      await expect(fixture.page.getByText("Updated notification content", { exact: true })).toBeVisible();
    });

    test("should show custom content for an initially empty dataset", async ({ fixture }) => {
      await fixture.gridComponent().evaluate((grid: VerificationGridComponent) => {
        grid.getPage = () => Promise.resolve({ subjects: [], context: {}, totalItems: 0 });
      });
      await expect(fixture.page.getByRole("heading", { name: "Thanks for reviewing these recordings!" })).toBeVisible();
      await expect(fixture.page.getByText("No un-validated results found")).toBeHidden();
      await expect(fixture.gridComponent().locator(".decision-controls")).toBeHidden();
      await expect(fixture.gridComponent().locator("oe-verification")).toHaveJSProperty("disabled", true);
      await expect(fixture.gridComponent().locator("oe-skip")).toHaveJSProperty("disabled", true);
    });

    test("should restore the default message when the subjects-exhausted content is removed", async ({ fixture }) => {
      await fixture.gridComponent().evaluate((grid: VerificationGridComponent) => {
        grid.getPage = () => Promise.resolve({ subjects: [], context: {}, totalItems: 0 });
      });
      await expect(fixture.page.getByRole("heading", { name: "Thanks for reviewing these recordings!" })).toBeVisible();

      await fixture
        .gridComponent()
        .locator('[slot="subjects-exhausted"]')
        .evaluate((content) => {
          content.remove();
        });
      await expect(fixture.messageOverlay()).toHaveText(
        "No un-validated results found All 0 annotations are validated",
      );
    });

    test("should use the default message for an empty dataset without custom content", async ({ fixture }) => {
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

      await fixture.gridComponent().evaluate((grid: VerificationGridComponent) => {
        const notification = document.createElement("div");
        notification.slot = "subjects-exhausted";
        notification.textContent = "Added after exhaustion";
        grid.appendChild(notification);
      });
      await expect(fixture.page.getByText("Added after exhaustion", { exact: true })).toBeVisible();
      await expect(fixture.page.getByText("No un-validated results found")).toBeHidden();
    });

    test("should not show custom content while subjects are loading", async ({ fixture }) => {
      await expect(fixture.gridComponent()).toHaveJSProperty("loadState", "dataset-fetching");
      await expect(fixture.messageOverlay()).toContainText("Loading");
      await expect(fixture.page.getByRole("heading", { name: "Thanks for reviewing these recordings!" })).toHaveCount(
        0,
      );
      await expect(fixture.gridComponent().locator('slot[name="subjects-exhausted"]')).toHaveCount(0);
    });

    test("should keep decision controls visible until the pending subject stream finishes", async ({ fixture }) => {
      const finishFetching = await fixture.gridComponent().evaluateHandle((grid: VerificationGridComponent) => {
        let finish!: () => void;
        const pendingPage = new Promise<IPageFetcherResponse<Record<string, never>>>((resolve) => {
          finish = () => {
            resolve({ subjects: [], context: {}, totalItems: 0 });
          };
        });
        grid.getPage = () => pendingPage;
        return finish;
      });

      try {
        await expect(fixture.gridComponent()).toHaveJSProperty("loadState", "dataset-fetching");
        await expect(fixture.messageOverlay()).toContainText("Loading");
        await expect(fixture.gridComponent().locator(".decision-controls")).toBeVisible();
        await expect(fixture.gridComponent().locator(".verification-controls-title")).toBeVisible();
        await expect(fixture.gridComponent().locator("oe-verification")).toHaveJSProperty("disabled", true);
      } finally {
        await finishFetching.evaluate((finish) => {
          finish();
        });
        await finishFetching.dispose();
      }

      await expect(fixture.gridComponent().locator('[slot="subjects-exhausted"]')).toHaveText(
        "Thanks for reviewing these recordings! You can close this page now.",
      );
      await expect(fixture.gridComponent().locator(".decision-controls")).toBeHidden();
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
            ${customContent}
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
