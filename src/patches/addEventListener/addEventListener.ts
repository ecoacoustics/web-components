import { eventListenersPatchKey, EventType } from "../eventTarget";
import { deregisterPatch, hasRegisteredPatch, registerPatch } from "../patches";

const patchIdentifier = Symbol("__oe_patch_EventTarget.addEventListener");

const originalAddEventListener = EventTarget.prototype.addEventListener;

/**
 * @description
 * Returns a boolean indicating whether the target element has a "click like"
 * event listener.
 * e.g. "click", "mousedown", "pointerdown"
 */
export function hasClickLikeEventListener(target: EventTarget): boolean {
  if (target instanceof HTMLElement && target.dataset.hasPointerEventListener === "true") {
    return true;
  }

  const targetListeners = target[eventListenersPatchKey];
  if (!targetListeners) {
    return false;
  }

  const clickLikeEvents = ["click", "mousedown", "pointerdown"];
  return clickLikeEvents.some((event) => targetListeners.has(event));
}

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
    if (type === "pointerdown" || type === "mousedown" || type === "click") {
      this[eventListenersPatchKey] ??= new Set<EventType>();
      this[eventListenersPatchKey].add(type);

      if (this instanceof HTMLElement) {
        this.dataset.hasPointerEventListener = "true";
      }
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
