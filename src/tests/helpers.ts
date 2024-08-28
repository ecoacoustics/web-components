import type { Locator, Page } from "@playwright/test";
import { Size } from "../models/rendering";
import { MousePosition } from "../components";
import { KeyboardModifiers } from "../helpers/types/playwright";
import { expect } from "./assertions";
import { Pixel } from "../models/unitConverters";

export async function getElementSize<T extends HTMLElement>(element: T | Locator): Promise<Size> {
  const width = (await getBrowserValue<T>(element, "clientWidth")) as number;
  const height = (await getBrowserValue<T>(element, "clientHeight")) as number;
  return { width, height };
}

export async function changeToMobile(page: Page) {
  const mobileSize: Size = { width: 320, height: 568 };
  await page.setViewportSize(mobileSize);
}

export async function changeToTablet(page: Page) {
  const tabletSize: Size = { width: 768, height: 1024 };
  await page.setViewportSize(tabletSize);
}

export async function changeToDesktop(page: Page) {
  const desktopSize: Size = { width: 1920, height: 1080 };
  await page.setViewportSize(desktopSize);
}

export async function insertHtml(page: Page, html: string) {
  await page.setContent(html);
  await page.waitForLoadState("networkidle");
}

export async function getBrowserStyles<T extends HTMLElement>(component: Locator): Promise<CSSStyleDeclaration> {
  return await component.evaluate((element: T) => {
    return window.getComputedStyle(element);
  });
}

export async function getCssVariable<T extends HTMLElement>(locator: Locator, name: string): Promise<string> {
  return await locator.evaluate((element: T, variable: string) => {
    return window.getComputedStyle(element).getPropertyValue(variable);
  }, name);
}

/**
 * @description
 * Simulates the user dragging the mouse from the start position to an end
 * position.
 *
 * @param start - The starting position of the drag
 * @param end - The ending position of the drag
 * @param modifiers - An array of keyboard modifiers to hold down during the drag
 */
export async function dragSelection(
  page: Page,
  start: MousePosition,
  end: MousePosition,
  modifiers: KeyboardModifiers = [],
) {
  await page.mouse.move(start.x, start.y);

  for (const modifier of modifiers) {
    await page.keyboard.down(modifier);
  }
  await page.mouse.down();

  // by using step 10, there will be 10 intermediate points between the start
  // and end destination. Better simulating a user drag action because users
  // can usually not instantly move their mouse across the screen
  await page.mouse.move(end.x, end.y, { steps: 10 });

  await page.mouse.up();
  for (const modifier of modifiers) {
    await page.keyboard.up(modifier);
  }
}

/**
 * @description
 * Simulates the user dragging a slider to a location
 * You should use this instead of setting a sliders value directly because it
 * better simulates a user interaction.
 * Additionally, it simulates dragging the slider instead of teleporting the
 * mouse to the correct location in the range input.
 */
export async function dragSlider(page: Page, locator: Locator, value: number) {
  await locator.scrollIntoViewIfNeeded();

  const currentValue = (await getBrowserValue<HTMLInputElement>(locator, "value")) as number;
  const elementBoundingBox = await locator.boundingBox();
  if (!elementBoundingBox) {
    throw new Error("Could not find the bounding box of the element");
  }

  /**
   * @returns
   * A pixel amount that the slider thumb should be dragged to reach the
   * desired value.
   */
  const relativeOffset = async (value: number): Promise<Pixel> => {
    const minimumValue = (await getBrowserValue<HTMLInputElement>(locator, "min")) as number;
    const maximumValue = (await getBrowserValue<HTMLInputElement>(locator, "max")) as number;
    const valueDelta = Math.abs(maximumValue - minimumValue);

    // the magnitude represents how many pixels the slider thumb should be
    // dragged for each unit of value change
    const magnitude = elementBoundingBox.width / valueDelta;

    return (value - minimumValue) * magnitude;
  };

  const relativeCurrentTrackLocation = await relativeOffset(currentValue);
  const relativeTargetTrackLocation = await relativeOffset(value);

  // because mouse movements are relative to the position in the viewport, we
  // get the current location of the slider thumb and the target location of the
  // slider thumb relative to the viewport
  const absoluteCurrentTrackLocation = elementBoundingBox.x + relativeCurrentTrackLocation;
  const absoluteTargetTrackLocation = elementBoundingBox.x + relativeTargetTrackLocation;

  // we drag from the middle of the range input so that the mouse position is
  // directly over the thumb of the slider
  const yPosition = elementBoundingBox.y + elementBoundingBox.height / 2;

  const start = { x: absoluteCurrentTrackLocation, y: yPosition };
  const end = { x: absoluteTargetTrackLocation, y: yPosition };

  await locator.hover();
  await dragSelection(page, start, end);

  // assert that the sliders value was updated correctly
  await expect(locator).toHaveJSProperty("value", value.toString());
}

export async function emitBrowserEvent<T extends HTMLElement>(locator: Locator, eventName: string) {
  return locator.evaluate((element: T, name: string) => {
    const event = new Event(name, { bubbles: true });
    element.dispatchEvent(event);
  }, eventName);
}

export async function catchEvent(locator: Page, name: string) {
  return locator.evaluate((name: string) => {
    return new Promise((resolve) => {
      document.addEventListener(name, (data) => resolve(data));
    });
  }, name);
}

// TODO: Combine this with the catchEvent function
export async function catchLocatorEvent(locator: Locator, name: string) {
  return locator.evaluate((element: HTMLElement, name: string) => {
    return new Promise((resolve) => {
      element.addEventListener(name, (data) => resolve(data));
    });
  }, name);
}

export async function logEvent(page: Page, name: string) {
  await page.evaluate((name) => {
    const eventStoreKey = `oe-${name}-events`;
    window[eventStoreKey] = [];
    document.addEventListener(name, (data) => window[eventStoreKey].push(data));
  }, name);
}

export async function getEventLogs(page: Page, name: string) {
  return await page.evaluate((name) => {
    const eventStoreKey = `oe-${name}-events`;
    return window[eventStoreKey];
  }, name);
}

// TODO: We can smartly work out if it is a method or a property, and invoke it or read it
// we can also work out if it is a primitive or not. If it is not, we should serialize it
export async function getBrowserValue<T extends HTMLElement>(component: any, key: keyof T): Promise<T[keyof T]> {
  return await component.evaluate((element: T, { key }: { key: keyof T }) => element[key], { key });
}

export async function setBrowserValue<T>(component: any, key: keyof T, value: T[keyof T]) {
  await component.evaluate((element: T, { key, value }: any) => ((element as any)[key] = value), { key, value });
}

// TODO: The generic typing here is incorrect because it's for properties not attributes
/**
 * @param component
 * @param key
 * @param value - The value to set the attribute to. If a value is not provided, it will be set as a boolean attribute
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/setAttribute#parameters
 */
export async function setBrowserAttribute<T extends HTMLElement>(component: Locator, key: keyof T, value = "") {
  await component.evaluate((element: T, { key, value }: any) => element.setAttribute(key.toString(), value), {
    key,
    value,
  });
}

export async function removeBrowserAttribute<T extends HTMLElement>(component: any, key: keyof T) {
  await component.evaluate((element: T, { key }: { key: keyof T }) => element.removeAttribute(key.toString()), { key });
}

export async function getBrowserAttribute<T extends HTMLElement>(component: any, key: string): Promise<string> {
  return await component.evaluate((element: T, { key }: { key: string }) => element.getAttribute(key.toString()), {
    key,
  });
}

export async function hasBrowserAttribute<T extends HTMLElement>(component: any, key: keyof T) {
  return await component.evaluate((element: T, { key }: { key: keyof T }) => element.hasAttribute(key.toString()), {
    key,
  });
}

export async function invokeBrowserMethod<T extends HTMLElement>(
  component: any,
  key: keyof T,
  ...args: any[]
): Promise<unknown> {
  return await component.evaluate(
    (element: T, key: keyof T, args: any[] = []) => (element[key] as (...args: any) => any)(...args),
    key,
    args,
  );
}
