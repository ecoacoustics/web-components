import { PropertyDeclaration } from "lit";

/** Can be used to type a TypeScript enum */
export type Enum = Readonly<{ [key: number]: string | number }>;

/**
 * A union representing the possible underlying types of enum members
 * @template T The enum type
 */
export type EnumValue<T extends Enum> = Readonly<T[keyof T]>;

/**
 * A type that represents the value type of a key on an enum
 * @template T The enum type
 */
export type EnumKeyValue<T extends Enum, key extends keyof T> = Readonly<T[key]>;

// I have created a type alias for the Lit attribute converter because they
// didn't export the type
/** An attribute converter type alias defined by Lit */
export type AttributeConverter = PropertyDeclaration["converter"];

// TODO: this type should use a type guard to check that the "target" property
// on the original event satisfies the generic T
/**
 * A type that represents a change event emitted by a HTML element
 * @template T The type of the events target element
 */
export type ChangeEvent<T extends HTMLElement> = Event & {
  target: T;
};

/** A type that can be used to represent a stringified css variable */
export type CssVariable = `--${string}`;

/**
 * A theming variable that is defined in our theming.css file and customized by
 * the host website.
 */
export type ThemingVariable = `--oe-${string}`;

export type FixedLengthArray<T, Length> = Array<T> & { length: Length };

/**
 * A number type that is guaranteed to not be NaN.
 * In normal TypeScript, a "number" type can also be a NaN or Infinite value
 * (e.g -Infinity, Infinity, NaN are all number types).
 *
 * You will probably need to type narrow a number type before using a function
 * that accepts this type.
 * You can use the "isValidNumber" guard.
 */
export type ValidNumber = number;

export type FixedLengthSet<T, Length> = Set<T> & { size: Length };

/** Extracts the constructor of a class that can be used as a type */
export type Constructor<T extends object, Args extends unknown[] = any[]> = new (...args: Args) => T;

/**
 * A JavaScript object of key-value pairs.
 * This is needed because the TypeScript "object" type represents any truthy
 * value, and Record<string, unknown> does not handle all record edge cases
 * (such as when the key is a symbol).
 */
export type ObjectRecord = Record<PropertyKey, unknown>;

/**
 * @description
 * Extracts the values of an object type as a union type.
 */
export type ObjectValues<T extends ObjectRecord> = T[keyof T];

/**
 * A JavaScript variable that is stored in the heap, and variables store a
 * reference to instead of the value itself.
 * This is useful for conditional typing where you might want to make all
 * reference/pointer variables readonly when exposing them to user space so that
 * the user cannot accidentally modify the internal state of the program.
 */
export type HeapVariable = ObjectRecord | unknown[] | Map<PropertyKey, unknown> | Set<unknown>;

export type StackVariable = string | number | bigint | boolean | null | undefined;

/**
 * Converts a structural type to a nominal type
 *
 * @example
 * ```typescript
 * type StructuralType = "a" | "b" | "c";
 * type NominalType = StructuralToNominal<StructuralType>;
 * ```
 *
 * In the example above, the `NominalType` will be converted to a "string" type
 * because the `StructuralType` is a discriminated union of string literals.
 */
export type StructuralToNominal<T> = T extends infer U ? U : never;

export type SetTimeoutRef = ReturnType<typeof setTimeout>;
