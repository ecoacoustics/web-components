import { expect } from "../../../tests/assertions";
import { chromeHostFixture as test } from "./chromeHost.fixture";
import { catchEvent } from "../../../tests/helpers";

test("should create", async ({ fixture }) => {
  await fixture.create();
  expect(fixture.hostComponent()).toBeDefined();
});

test.describe("connecting providers", () => {
  test("should dispatch chrome advertisement event on first update", async ({ fixture }) => {
    const advertisementEvent = catchEvent(fixture.page, "oe-chrome-advertisement");

    await fixture.create();

    const resolvedEvent = (await advertisementEvent) as CustomEvent;
    const resolvedEventData = resolvedEvent.detail;

    expect(resolvedEventData).toEqual({
      connect: expect.any(Function),
      disconnect: expect.any(Function),
    });
  });

  test("should connect provider", () => {});
});

test.describe("disconnecting", () => {
  test("should disconnect valid provider", () => {});

  test("should have no operation if provider is not connected", () => {});

  test("should disconnect all providers on host disconnect", () => {});
});

test.describe("chrome rendering", () => {
  test("should handle provider with all chrome regions", () => {});

  test("should handle multiple providers", () => {});

  test("should call chromeRendered on providers after update", () => {});

  test("should update provider if chrome provider updates", () => {});
});
