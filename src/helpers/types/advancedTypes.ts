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
