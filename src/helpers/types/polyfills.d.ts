declare global {
  interface ArrayConstructor {
    // TypeScript has a bug where using Array.isArray() on a readonly type will
    // broaden the type passed in to "any[]".
    // by overriding the globals.d.ts definition, we can narrow the type passed
    // in to ReadonlyArray<T>.
    // see: https://github.com/microsoft/TypeScript/issues/17002
    isArray<T>(arg: ReadonlyArray<T> | unknown): arg is ReadonlyArray<T>;
  }
}

export {};
