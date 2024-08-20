export function isMacOs(): boolean {
  // TypeScript thinks that userAgentData can be undefined because it is not
  // yet implemented on Firefox
  // however, we have polyfilled the userAgentData object so we can be sure
  // that userAgentData is implemented
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return navigator.userAgentData!.platform.toLowerCase().includes("mac");
}

/**
 * @description
 * Returns true if the Ctrl key is held down on Windows or Linux
 * and returns true if the Command key is held down on MacOS
 *
 * This is useful because MacOS uses the command key instead of the ctrl key for
 * keyboard shortcuts e.g. Cmd + A instead of Ctrl + A
 */
export function hasCtrlLikeModifier(event: PointerEvent | KeyboardEvent): boolean {
  // The command key is defined as the "meta" key in the KeyboardEvent and
  // PointerEvent objects therefore, we conditionally check if the meta key is
  // pressed instead of the ctrl key if the user is on a Mac
  // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/metaKey
  return isMacOs() ? event.metaKey : event.ctrlKey;
}
