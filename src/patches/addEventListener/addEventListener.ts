/// <reference types="./addEventListener.d.ts" />

type EventType = string;

export interface PatchedEventListener {
  [eventListenersPatchKey]?: Set<EventType>;
}

export interface PatchedWindow {
  readonly [patchedMethodsKey]: Set<EventType>;
}

const eventListenersPatchKey = "__oe_event_listeners";
const patchedMethodsKey = "__oe_patched_methods";
const patchIdentifier = "__oe_patch_EventTarget.addEventListener";

const originalAddEventListener = EventTarget.prototype.addEventListener;

/**
 * @description
 * Returns a boolean indicating whether the target element has a "click like"
 * event listener.
 * e.g. "click", "mousedown", "pointerdown"
 */
export function hasClickLikeEventListener(target: EventTarget): boolean {
  const targetListeners = target[eventListenersPatchKey];
  if (!targetListeners) {
    return false;
  }

  const clickLikeEvents = ["click", "mousedown", "pointerdown"];
  return clickLikeEvents.some((event) => targetListeners.has(event));
}

export function patchAddEventListener(): void {
  if (hasPatchedAddEventListener()) {
    return;
  }

  window[patchedMethodsKey].add(patchIdentifier);

  EventTarget.prototype.addEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    if (type !== "pointerdown" && type !== "mousedown" && type !== "click") {
      this[eventListenersPatchKey] ??= new Set<EventType>();
      this[eventListenersPatchKey].add(type);
    }

    originalAddEventListener.call(this, type, listener, options);
  };
}

function hasPatchedAddEventListener(): boolean {
  // We expect that there will be an error here because the __oe_patched_methods
  // property is readonly in the PatchedWindow interface.
  // However, we still need to correctly initialize it on the window object.
  // @ts-ignore
  window[patchedMethodsKey] ??= new Set<EventType>();
  return window[patchedMethodsKey].has(patchIdentifier);
}
