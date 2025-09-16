import { eventListeners } from "../eventTarget";
import { deregisterPatch, hasRegisteredPatch, registerPatch } from "../patches";

const patchIdentifier = Symbol("__oe_patch_EventTarget.removeEventListener");

const originalRemoveEventListener = EventTarget.prototype.removeEventListener;

export function patchRemoveEventListener(): void {
  if (hasRegisteredPatch(patchIdentifier)) {
    return;
  }

  registerPatch(patchIdentifier);

  EventTarget.prototype.removeEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void {
    if (this[eventListeners]?.has(type)) {
      this[eventListeners].delete(type);
    }

    originalRemoveEventListener.call(this, type, listener, options);
  };
}

export function unpatchRemoveEventListener(): void {
  if (!hasRegisteredPatch(patchIdentifier)) {
    return;
  }

  deregisterPatch(patchIdentifier);
}
