// Copyright: dna-engine ~~ MIT License
// https://github.com/dna-engine/dna-engine
function userAgentPolyfill(): NavigatorUAData {
  const brandEntry = navigator.userAgent.split(" ").pop()?.split("/") ?? [];
  const hasTouch = !!navigator.maxTouchPoints;
  const platform = navigator.platform;
  const mac = hasTouch ? "iOS" : "macOS";
  const platforms = { MacIntel: mac, Win32: "Windows", iPhone: "iOS", iPad: "iOS" };
  return {
    brands: [{ brand: brandEntry?.[0] ?? "", version: brandEntry?.[1] ?? "" }],
    mobile: hasTouch || /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent),
    platform: (platforms as any)[platform] ?? platform,
  } as any;
}

const userAgentDataKey = "userAgentData";

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
const forceMonkeyPatch = navigator.platform === "MacIntel";

// if multiple components are imported from multiple entry point, we only want
// to apply the polyfill once
if (!(userAgentDataKey in navigator)) {
  // if we don't use defineProperty, on Chrome we get the error
  // Cannot set property userAgentData of #<Navigator> which has only a getter
  const polyfill = userAgentPolyfill();
  Object.defineProperty(navigator as any, userAgentDataKey, {
    get: () => polyfill,
  });
}
