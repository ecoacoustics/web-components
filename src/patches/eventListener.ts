import { deregisterPatch, hasRegisteredPatch, registerPatch } from "./patches";

type EventType = string;
export interface PatchedEventListener {
  [eventListeners]?: Set<EventType>;
}

const eventListeners = Symbol("__oe_event_listeners");
const patchIdentifier = Symbol("__oe_patch_EventTarget.registerClickLikeEvents");

const originalAddEventListener = EventTarget.prototype.addEventListener;
const originalRemoveEventListener = EventTarget.prototype.removeEventListener;

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

  return targetListeners.has("click") || targetListeners.has("pointerdown");
}

/**
 * @description
 * A monkey patch for `addEventListener` and `removeEventListener` that tracks
 * whether an element has a "click like" event listener
 * (e.g. "click", "pointerdown").
 */
export function patchTrackClickLikeEvents(): void {
  if (hasRegisteredPatch(patchIdentifier)) {
    return;
  }

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

  registerPatch(patchIdentifier);
}

export function unpatchTrackClickLikeEvents(): void {
  if (!hasRegisteredPatch(patchIdentifier)) {
    return;
  }

  deregisterPatch(patchIdentifier);
  EventTarget.prototype.removeEventListener = originalRemoveEventListener;
  EventTarget.prototype.addEventListener = originalAddEventListener;
}
