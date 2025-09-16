import { eventListeners, EventType } from "../eventTarget";
import { deregisterPatch, hasRegisteredPatch, registerPatch } from "../patches";

const patchIdentifier = Symbol("__oe_patch_EventTarget.addEventListener");

const originalAddEventListener = EventTarget.prototype.addEventListener;

/**
 * @description
 * Returns a boolean indicating whether the target element has a "click like"
 * event listener.
 * e.g. "click", "pointerdown"
 */
export function hasClickLikeEventListener(target: EventTarget): boolean {
  const targetListeners = target[eventListeners];
  if (!targetListeners) {
    return false;
  }

  const clickLikeEvents = ["click", "pointerdown"];
  return clickLikeEvents.some((event) => targetListeners.has(event));
}

/**
 * @description
 * A monkey patch for `addEventListener` that tracks whether an element has a
 * "click like" event listener (e.g. "click", "pointerdown").
 */
export function patchAddEventListener(): void {
  if (hasRegisteredPatch(patchIdentifier)) {
    return;
  }

  registerPatch(patchIdentifier);

  EventTarget.prototype.addEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    if (type === "pointerdown" || type === "click") {
      this[eventListeners] ??= new Set<EventType>();
      this[eventListeners].add(type);
    }

    originalAddEventListener.call(this, type, listener, options);
  };
}

export function unpatchAddEventListener(): void {
  if (!hasRegisteredPatch(patchIdentifier)) {
    return;
  }

  deregisterPatch(patchIdentifier);
  EventTarget.prototype.addEventListener = originalAddEventListener;
}
