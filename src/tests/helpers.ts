import type { Page } from "@playwright/test";

export async function insertHtml(page: Page, html: string) {
  await page.setContent(html);
  await page.waitForLoadState("networkidle");
}

// TODO: We can smartly work out if it is a method or a property, and invoke it or read it
// we can also work out if it is a primitive or not. If it is not, we should serialize it
export async function getBrowserValue<T, Key extends keyof T>(component: any, key: Key): Promise<T[Key]> {
  return await component.evaluate((element: T) => element[key]);
}

export async function setBrowserValue<T, Key extends keyof T>(component: any, key: Key, value: T[Key]) {
  await component.evaluate((element: T, value: T[Key]) => {
    element[key] = value;
  }, value);
}

export async function invokeBrowserMethod<T, Key extends keyof T>(component: any, key: Key, ...args: any[]) {
  return await component.evaluate(
    (element: T, key: Key, args: any[]) => {
      (element[key] as any)(...args);
    },
    key,
    args,
  );
}
