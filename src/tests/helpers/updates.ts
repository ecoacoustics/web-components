import { Locator } from "@playwright/test";
import { LitElement } from "lit";

/**
 * @description
 * Requests a LitElement to update and waits for the update to complete.
 */
export async function requestUpdate(target: Locator) {
  await target.evaluate((element: LitElement) => {
    element.requestUpdate();
  });
}
