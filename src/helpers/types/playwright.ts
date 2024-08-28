// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Locator } from "@playwright/test";

/** An options object that can be passed to a locators click method */
export type ClickEventOptions = Parameters<Locator["click"]>[0] & object;

/**
 * A type that represents the keyboard modifiers that can be emitted with a
 * Playwright mouse.down() or keyboard.down() event
 */
export type KeyboardModifiers = ClickEventOptions["modifiers"];
