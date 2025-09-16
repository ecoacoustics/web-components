export const eventListeners = Symbol("__oe_event_listeners");

export type EventType = string;

export interface PatchedEventListener {
  [eventListeners]?: Set<EventType>;
}
