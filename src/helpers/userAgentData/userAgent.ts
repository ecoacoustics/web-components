// on Mac navigator.platform returns "MacIntel"
export function isMacOs(): boolean {
  // Some versions of Chromium on MacOS (e.g. the version used by GitHub CI
  // runners) incorrectly report userAgentData.platform as "Windows". Because
  // shortcuts behave slightly different on MacOS (e.g. switching ctrl and cmd),
  // this would cause shortcuts to break on some platform. To fix this, we always
  // monkey patch navigator.platform's that report as "MacIntel".
  //
  // Note: navigator.platform is deprecated, however this mis-reporting of MacOS
  // was fixed in newer versions of Chromium that do implement navigator.platform
  // so it'd actually be beneficial to us if Chromium removed support for
  // navigator.platform because then this monkey patch would only be applied to
  // old versions of Chromium. If support is removed, navigator.platform will
  // just return "undefined" and cause any errors.
  const forceMacOS = navigator.platform === "MacIntel";
  if (forceMacOS) {
    return true;
  }

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
 *
 * @returns
 * Windows & Linux > Returns true if the user was holding ctrl during the event
 *
 * MacOS > Returns true if the user was holding meta during the event
 */
export function hasCtrlLikeModifier(event: PointerEvent | KeyboardEvent): boolean {
  // The command key is defined as the "meta" key in the KeyboardEvent and
  // PointerEvent objects therefore, we conditionally check if the meta key is
  // pressed instead of the ctrl key if the user is on a Mac
  // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/metaKey
  return isMacOs() ? event.metaKey : event.ctrlKey;
}
