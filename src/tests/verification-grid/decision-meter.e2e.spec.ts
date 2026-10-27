import { verificationGridFixture as test } from "./verification-grid.e2e.fixture";
import { expect } from "../assertions";

test.describe("decision meter", () => {
  test.describe("responsive layout", () => {
    for (const segmentCount of [1, 3, 4, 8]) {
      test(`should fit ${segmentCount} segments without overflow or height changes`, async ({ fixture }) => {
        const classifications = Array.from(
          { length: segmentCount },
          (_, index) => `<oe-classification tag="tag-${index}"></oe-classification>`,
        ).join("");
        await fixture.create(classifications);
        const taskMeter = fixture.taskMeterComponents().first();
        const segments = fixture.gridTileTaskMeterSegments();
        await expect(segments).toHaveCount(segmentCount);

        for (const columnWidth of [15, 24, 32, 40, 48, 100, 300, 600]) {
          for (const gap of [0, 4]) {
            const geometry = await taskMeter.evaluate(
              (element, { columnWidth, gap }) => {
                element.style.width = `${columnWidth}px`;
                element.style.setProperty("--oe-task-meter-min-width", "0px");
                element.style.fontSize = "16px";
                element.style.setProperty("--oe-task-meter-gap", `${gap}px`);
                element.style.setProperty("--oe-task-meter-border-width", "3px");
                element.style.setProperty("--oe-task-meter-height", "12px");
                const meter = element.shadowRoot?.querySelector<HTMLElement>(".task-meter");
                if (!meter) {
                  throw new Error("Task meter container was not rendered");
                }
                const bounds = meter.getBoundingClientRect();
                const style = getComputedStyle(meter);
                return {
                  width: bounds.width,
                  height: bounds.height,
                  scrollWidth: meter.scrollWidth,
                  gap: Number.parseFloat(style.columnGap),
                  outlineWidth: Number.parseFloat(style.outlineWidth),
                  outlineOffset: Number.parseFloat(style.outlineOffset),
                  segments: Array.from(meter.querySelectorAll(".task-meter-segment"), (segment) => {
                    const segmentBounds = segment.getBoundingClientRect();
                    return {
                      left: segmentBounds.left - bounds.left,
                      right: segmentBounds.right - bounds.left,
                      width: segmentBounds.width,
                      height: segmentBounds.height,
                      separatorWidth: Number.parseFloat(getComputedStyle(segment).borderRightWidth),
                    };
                  }),
                };
              },
              { columnWidth, gap },
            );

            expect(geometry.width).toBeCloseTo(columnWidth);
            expect(geometry.height).toBe(12);
            expect(geometry.scrollWidth).toBeLessThanOrEqual(columnWidth);
            expect(geometry.outlineOffset).toBeCloseTo(-geometry.outlineWidth);
            for (const segment of geometry.segments) {
              expect(segment.left).toBeGreaterThanOrEqual(0);
              expect(segment.right).toBeLessThanOrEqual(columnWidth + 0.1);
              expect(segment.width).toBeGreaterThan(0);
              expect(segment.height).toBe(12);
              if (columnWidth / segmentCount <= 12) {
                expect(segment.separatorWidth).toBe(0);
              }
            }
            if (columnWidth <= segmentCount * 8) {
              expect(geometry.gap).toBeCloseTo(0);
            } else if (columnWidth >= segmentCount * 8 + (segmentCount - 1) * gap) {
              expect(geometry.gap).toBeCloseTo(gap);
            }
          }
        }

        await taskMeter.evaluate((element) => {
          element.style.width = "15px";
        });
        const hoveredSegment = Math.floor(segmentCount / 2);
        // A centered 1px hit-test area can overlap the next segment when segments are narrower than 2px.
        await segments.nth(hoveredSegment).hover({ position: { x: 0, y: 6 } });
        await expect(
          fixture.page.getByRole("tooltip", { name: `tag-${hoveredSegment} (no decision)`, exact: true }),
        ).toBeVisible();
      });
    }
  });

  test.describe("classification task", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.createWithClassificationTask();
      await fixture.changeGridSize(3);
    });

    test("should have the correct number of segments in the progress meter", async ({ fixture }) => {
      await expect(fixture.gridTileTaskMeterSegments()).toHaveCount(3);
    });

    test("should outline every segment and preserve every gap", async ({ fixture }) => {
      const taskMeter = fixture.taskMeterComponents().first();
      const meter = taskMeter.locator(".task-meter");
      const segments = fixture.gridTileTaskMeterSegments();

      await taskMeter.evaluate((element) => {
        element.style.setProperty("--oe-task-meter-border-width", "2px");
        element.style.setProperty("--oe-task-meter-gap", "4px");
      });

      await expect(meter).toHaveCSS("outline-width", "0px");
      for (const segment of await segments.all()) {
        await expect(segment).toHaveCSS("outline-width", "2px");
        await expect(segment).toHaveCSS("outline-offset", "-2px");
        await expect(segment).toHaveCSS("outline-style", "solid");
      }

      const gaps = await segments.evaluateAll((elements) =>
        elements.slice(1).map((element, index) => {
          const previousBounds = elements[index].getBoundingClientRect();
          return element.getBoundingClientRect().left - previousBounds.right;
        }),
      );
      expect(gaps).toHaveLength(2);
      for (const gap of gaps) {
        expect(gap).toBeCloseTo(4);
      }

      await taskMeter.evaluate((element) => {
        element.style.setProperty("--oe-task-meter-gap", "0");
      });
      await expect(meter).toHaveCSS("outline-width", "2px");
      for (const segment of await segments.all()) {
        await expect(segment).toHaveCSS("outline-width", "0px");
      }
      await expect(segments.first()).toHaveCSS("border-right-width", "2px");
      await expect(segments.last()).toHaveCSS("border-right-width", "0px");
    });

    test("should support dense layouts through host styles", async ({ fixture }) => {
      const taskMeter = fixture.taskMeterComponents().first();
      await taskMeter.evaluate((element) => {
        element.style.height = "0.5em";
        element.style.fontSize = "16px";
        element.style.margin = "0";
      });

      await expect(taskMeter).toHaveCSS("margin-top", "0px");
      await expect(taskMeter).toHaveCSS("margin-bottom", "0px");
      for (const segment of await fixture.gridTileTaskMeterSegments().all()) {
        await expect(segment).toHaveCSS("height", "8px");
      }
    });

    test("should enforce the default host minimum width", async ({ fixture }) => {
      const taskMeter = fixture.taskMeterComponents().first();
      await taskMeter.evaluate((element) => {
        element.style.width = "1px";
        element.style.fontSize = "16px";
      });

      await expect(taskMeter).toHaveCSS("width", "16px");
      await expect(taskMeter).toHaveCSS("min-width", "16px");

      await taskMeter.evaluate((element) => {
        element.style.setProperty("--oe-task-meter-min-width", "0px");
      });
      await expect(taskMeter).toHaveCSS("width", "1px");
    });

    test("should have the correct colors without a decision", async ({ fixture }) => {
      const gridSize = await fixture.getGridSize();
      const expectedColors = Array.from({ length: gridSize }).fill(await fixture.panelColor());
      const realizedColors = await fixture.progressMeterColors();
      expect(realizedColors).toEqual(expectedColors);
    });

    test("should have the correct tooltips without a decision", async ({ fixture }) => {
      const expectedTooltips = ["car (no decision)", "koala (no decision)", "bird (no decision)"];
      const realizedTooltips = await fixture.progressMeterTooltips();
      expect(realizedTooltips).toEqual(expectedTooltips);
    });

    test("should change to the correct colors when a decision is made", async ({ fixture }) => {
      await fixture.makeClassificationDecision("car", true);

      const expectedColors = [
        await fixture.getClassificationColor("car", true),
        await fixture.panelColor(),
        await fixture.panelColor(),
      ];
      const realizedColors = await fixture.progressMeterColors();
      expect(realizedColors).toEqual(expectedColors);
    });

    test("should have the correct tooltips when a decision is made", async ({ fixture }) => {
      await fixture.makeClassificationDecision("car", true);

      const expectedTooltips = ["car (true)", "koala (no decision)", "bird (no decision)"];
      const realizedTooltips = await fixture.progressMeterTooltips();
      expect(realizedTooltips).toEqual(expectedTooltips);
    });

    test("should expose live decision text through CSS generated content", async ({ fixture }) => {
      await fixture
        .taskMeterComponents()
        .first()
        .evaluate((element) => {
          const root = element.getRootNode();
          if (!(root instanceof ShadowRoot)) {
            throw new Error("Task meter was not rendered in a tile shadow root");
          }
          const stylesheet = new CSSStyleSheet();
          stylesheet.replaceSync(`
          oe-task-meter::part(segment)::after {
            content: attr(data-decision);
          }
        `);
          root.adoptedStyleSheets = [...root.adoptedStyleSheets, stylesheet];
        });

      const generatedText = () =>
        fixture
          .gridTileTaskMeterSegments()
          .evaluateAll((segments) => segments.map((segment) => getComputedStyle(segment, "::after").content));
      await expect.poll(generatedText).toEqual(['"undecided"', '"undecided"', '"undecided"']);

      await fixture.makeClassificationDecision("car", true);
      await expect.poll(generatedText).toEqual(['"true"', '"undecided"', '"undecided"']);
    });

    test("should have the correct colors when multiple decisions are made", async ({ fixture }) => {
      await fixture.makeClassificationDecision("car", true);
      await fixture.makeClassificationDecision("koala", true);

      const expectedColors = [
        await fixture.getClassificationColor("car", true),
        await fixture.getClassificationColor("koala", true),
        await fixture.panelColor(),
      ];
      const realizedColors = await fixture.progressMeterColors();
      expect(realizedColors).toEqual(expectedColors);
    });

    test("should have the correct tooltips when multiple decisions are made", async ({ fixture }) => {
      await fixture.makeClassificationDecision("car", true);
      await fixture.makeClassificationDecision("koala", false);

      const expectedTooltips = ["car (true)", "koala (false)", "bird (no decision)"];
      const realizedTooltips = await fixture.progressMeterTooltips();
      expect(realizedTooltips).toEqual(expectedTooltips);
    });

    test("should change colors when a the decision is changed", async ({ fixture }) => {
      await fixture.makeClassificationDecision("car", true);
      await fixture.makeClassificationDecision("car", false);

      const expectedColors = [
        await fixture.getClassificationColor("car", false),
        await fixture.panelColor(),
        await fixture.panelColor(),
      ];
      const realizedColors = await fixture.progressMeterColors();
      expect(realizedColors).toEqual(expectedColors);
    });

    test("should have the correct tooltips when a decision is changed", async ({ fixture }) => {
      await fixture.makeClassificationDecision("car", true);
      await fixture.makeClassificationDecision("car", false);

      const expectedTooltips = ["car (false)", "koala (no decision)", "bird (no decision)"];
      const realizedTooltips = await fixture.progressMeterTooltips();
      expect(realizedTooltips).toEqual(expectedTooltips);
    });

    // these skip tests also assert that the progress meter behaves correctly
    // when navigating in history
    test("should have the correct colors when a decision is skipped", async ({ fixture }) => {
      await fixture.makeClassificationDecision("car", true);
      await fixture.skipButton().click();

      // when the skip button is clicked, the next page rendered
      // therefore, if we want to see that the correct colors were applied, we
      // have to navigate back in history
      await fixture.viewPreviousHistoryPage();

      const expectedColors = [
        await fixture.getClassificationColor("car", true),
        await fixture.skipColor(),
        await fixture.skipColor(),
      ];
      const realizedColors = await fixture.progressMeterColors();
      expect(realizedColors).toEqual(expectedColors);
    });

    test("should have the correct tooltips when a decision is skipped", async ({ fixture }) => {
      await fixture.makeClassificationDecision("car", true);
      await fixture.skipButton().click();

      // when the skip button is clicked, the next page rendered
      // therefore, if we want to see that the correct colors were applied, we
      // have to navigate back in history
      await fixture.viewPreviousHistoryPage();

      const expectedTooltips = ["car (true)", "koala (skip)", "bird (skip)"];
      const realizedTooltips = await fixture.progressMeterTooltips();
      expect(realizedTooltips).toEqual(expectedTooltips);
    });
  });

  test.describe("verification task", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.createWithVerificationTask();
    });

    test("should have the correct number of segments", async ({ fixture }) => {
      await expect(fixture.gridTileTaskMeterSegments()).toHaveCount(1);
    });

    test("should have the correct colors when a decision is made", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await fixture.viewPreviousHistoryPage();

      const expectedColors = [await fixture.getVerificationColor("true")];
      const realizedColors = await fixture.progressMeterColors();
      expect(realizedColors).toEqual(expectedColors);
    });

    test("should target verification state parts with CSS generated emoji", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await fixture.viewPreviousHistoryPage();
      await fixture
        .taskMeterComponents()
        .first()
        .evaluate((element) => {
          const root = element.getRootNode();
          if (!(root instanceof ShadowRoot)) {
            throw new Error("Task meter was not rendered in a tile shadow root");
          }
          const stylesheet = new CSSStyleSheet();
          stylesheet.replaceSync(`
          oe-task-meter::part(verification true)::before {
            content: "\\2705";
          }
          oe-task-meter::part(classification true)::before {
            content: "incorrect task";
          }
          oe-task-meter::part(verification false)::before {
            content: "incorrect state";
          }
        `);
          root.adoptedStyleSheets = [...root.adoptedStyleSheets, stylesheet];
        });

      const segment = fixture.gridTileTaskMeterSegments().first();
      await expect
        .poll(() => segment.evaluate((element) => getComputedStyle(element, "::before").content))
        .toBe('"\u2705"');
      await expect(fixture.gridTileTaskMeters().first()).toHaveAttribute(
        "aria-label",
        "Task progress: 1 of 1 decisions made. verification: koala (true)",
      );
    });

    test("should have the correct tooltips when a decision is made", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await fixture.viewPreviousHistoryPage();

      const expectedTooltips = ["verification: koala (true)"];
      const realizedTooltips = await fixture.progressMeterTooltips();
      expect(realizedTooltips).toEqual(expectedTooltips);
    });

    // Because skip decisions are handled slightly differently and there is a
    // bit of tech debt from the days when they weren't an actual decision
    // component, we have seen bugs where only skip decisions fail to show
    // correctly in the progress meter.
    test("should show skip decisions correctly", async ({ fixture }) => {
      await fixture.makeSkipDecision();

      // Skipping with no sub-selection completes every tile, so the grid
      // auto-pages. We navigate back in history to inspect the skipped tile.
      await fixture.viewPreviousHistoryPage();

      const realizedColors = await fixture.progressMeterColors();
      expect(realizedColors).toEqual([await fixture.skipColor()]);

      const progressMeterTooltips = await fixture.progressMeterTooltips();
      expect(progressMeterTooltips).toEqual(["verification: koala (skip)"]);
    });
  });

  test.describe("mixed classification and verification tasks", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.create(`
        <oe-verification verified="true">Positive</oe-verification>
        <oe-verification verified="false">Negative</oe-verification>

        <oe-classification tag="car">Car</oe-classification>
        <oe-classification tag="bird">Bird</oe-classification>
        <oe-classification tag="cat">Cat</oe-classification>
			`);
    });

    test("should have the correct number of segments", async ({ fixture }) => {
      await expect(fixture.gridTileTaskMeterSegments()).toHaveCount(4);
    });

    // make a verification decision and then make a classification decision
    // we should see that the progress meter is updated correctly
    test("should have the correct colors when decisions are made", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await fixture.makeClassificationDecision("car", false);

      const expectedColors = [
        await fixture.getVerificationColor("true"),
        await fixture.getClassificationColor("car", false),
        await fixture.panelColor(),
        await fixture.panelColor(),
      ];
      const realizedColors = await fixture.progressMeterColors();
      expect(realizedColors).toEqual(expectedColors);
    });

    test("should have the correct tooltips when decisions are made", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await fixture.makeClassificationDecision("car", false);

      const expectedTooltips = ["verification: koala (true)", "car (false)", "bird (no decision)", "cat (no decision)"];
      const realizedTooltips = await fixture.progressMeterTooltips();
      expect(realizedTooltips).toEqual(expectedTooltips);
    });
  });

  test.describe("compound tasks", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.createWithCompoundTask();
    });

    test("should have the correct number of progress meter segments", async ({ fixture }) => {
      await expect(fixture.gridTileTaskMeterSegments()).toHaveCount(2);
    });

    test("should have the appropriate color while the 'when' condition doesn't pass", async ({ fixture }) => {
      await expect(fixture.gridTileTaskMeterSegments().nth(0)).toHaveCSS("background", await fixture.panelColor());
      await expect(fixture.gridTileTaskMeterSegments().nth(1)).toHaveCSS(
        "background",
        await fixture.notRequiredColor(),
      );
    });

    test("should have the appropriate color if a tag is corrected", async ({ fixture }) => {
      const testedTileIndex = 0;
      await fixture.subSelect(testedTileIndex);

      // We have to make a false decision color before making a tag correction
      // because the "oe-tag-prompt" component has a "when" condition that keeps
      // the component disabled until a false decision is made.
      await fixture.makeVerificationDecision("false");

      await fixture.makeNewTagDecision("Noisy Miner");

      const expectedColors = [await fixture.getVerificationColor("false"), await fixture.getNewTagColor()];
      const realizedColors = await fixture.progressMeterColors(testedTileIndex);
      expect(realizedColors).toEqual(expectedColors);
    });

    test("should have no action when closing the tag correction popup", () => {});
  });
});
