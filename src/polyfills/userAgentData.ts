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

// if we don't use defineProperty, on Chrome we get the error
// Cannot set property userAgentData of #<Navigator> which has only a getter
const polyfill = navigator["userAgentData"] ?? userAgentPolyfill();
Object.defineProperty(navigator as any, "userAgentData", {
  get: () => polyfill,
});
