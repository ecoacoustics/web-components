import { PatchedEventListener, PatchedWindow } from "./addEventListener";

declare global {
  interface EventTarget extends PatchedEventListener {}
  interface Window extends PatchedWindow {}
}

export {};
