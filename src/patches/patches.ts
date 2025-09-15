export interface PatchedWindow {
  readonly [patchedMethodsKey]: Set<symbol>;
}

const patchedMethodsKey = Symbol("__oe_patched_methods");

export function registerPatch(identifier: symbol): void {
  // We expect that there will be an error here because the __oe_patched_methods
  // property is readonly in the PatchedWindow interface.
  // However, we still need to correctly initialize it on the window object.
  // @ts-ignore
  window[patchedMethodsKey] ??= new Set<symbol>();
  window[patchedMethodsKey].add(identifier);
}

export function deregisterPatch(identifier: symbol): void {
  if (!Object.prototype.hasOwnProperty.call(window, patchedMethodsKey)) {
    return;
  }

  window[patchedMethodsKey].delete(identifier);
}

export function hasRegisteredPatch(identifier: symbol): boolean {
  if (!Object.prototype.hasOwnProperty.call(window, patchedMethodsKey)) {
    return false;
  }

  return window[patchedMethodsKey].has(identifier);
}
