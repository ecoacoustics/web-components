const patchKey = "__oe_patches__event_listener";

export const handledEvents = new Map<EventTarget, EventTarget[]>();

export function patchEventListener(): void {
  if (hasPatchedEventListener()) {
    return;
  }

  const originalAddEventListener = EventTarget.prototype.addEventListener;

  EventTarget.prototype.addEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    if (type !== "pointerdown" && type !== "mousedown" && type !== "click") {
      originalAddEventListener.call(this, type, listener, options);
    }

    const patchedListener: EventListenerOrEventListenerObject = (event) => {
      handledEvents.set(this, event.composedPath());
      setTimeout(() => {
        handledEvents.delete(this);
      }, 1000);

      if (listener) {
        if (typeof listener === "function") {
          listener.call(this, event);
        } else {
          listener.handleEvent.call(listener, event);
        }
      }
    };

    originalAddEventListener.call(this, type, patchedListener, options);
  };

  (globalThis as any)[patchKey] = true;
}

function hasPatchedEventListener(): boolean {
  return (globalThis as any)[patchKey] === true;
}
