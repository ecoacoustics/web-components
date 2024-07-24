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
