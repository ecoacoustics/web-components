export const eventListenersPatchKey = Symbol("__oe_event_listeners");

export type EventType = string;

export interface PatchedEventListener {
  [eventListenersPatchKey]?: Set<EventType>;
}
