import { type StructuralToNominal } from "advancedTypes";

declare global {
  interface ArrayConstructor {
    // TypeScript has a bug where using Array.isArray() on a readonly type will
    // broaden the type passed in to "any[]".
    // by overriding the globals.d.ts definition, we can narrow the type passed
    // in to ReadonlyArray<T>.
    // see: https://github.com/microsoft/TypeScript/issues/17002
    isArray<T>(arg: ReadonlyArray<T> | unknown): arg is ReadonlyArray<T>;
  }

  interface Array<T> {
    // A patch for the TypeScript Array interface to support structural typing
    // (constant types).
    // This also adds structurally types the output of Array.prototype.includes
    // so that it can act as a type guard so that the TypeScript compiler knows
    // that the array contains the type of the search element.
    includes<K>(searchElement: K | StructuralToNominal<K>, fromIndex?: number): T is T & K;
  }

  interface Window {
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
  }

  interface ObjectConstructor {
    // A patch for the Object.entries method that type narrows the output types.
    entries<T extends Record<PropertyKey, unknown> | ArrayLike<T>>(value: T): [key: keyof T, value: T[keyof T]][];
  }
}

export {};
