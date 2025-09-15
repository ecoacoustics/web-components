import { PatchedEventListener } from "./eventTarget";
import { PatchedWindow } from "./patches";

declare global {
  interface EventTarget extends PatchedEventListener {}
  interface Window extends PatchedWindow {}
}

export {};
