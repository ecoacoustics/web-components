export interface PatchedWindow {
  [patchedMethods]: Set<symbol>;
}

const patchedMethods = Symbol("__oe_patched_methods");

/**
 * Maintains a global
 */
export function registerPatch(identifier: symbol): void {
  window[patchedMethods] ??= new Set<symbol>();
  window[patchedMethods].add(identifier);
}

export function deregisterPatch(identifier: symbol): void {
  if (!Object.prototype.hasOwnProperty.call(window, patchedMethods)) {
    return;
  }

  window[patchedMethods].delete(identifier);
}

export function hasRegisteredPatch(identifier: symbol): boolean {
  if (!Object.prototype.hasOwnProperty.call(window, patchedMethods)) {
    return false;
  }

  return window[patchedMethods].has(identifier);
}
