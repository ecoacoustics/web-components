import { pascalCase } from "change-case";

export function identityCase(value: string): string {
  return value;
}

/**
 * Convert a string to uppercase dot case (`Foo.Bar`).
 */
export function uppercaseDotCase(value: string): string {
  // By using the change-case library, we can maintain consistency with the
  // other case conversion functions.
  // Using the library also handles going from a lot more different cases to
  // our desired casing.
  return pascalCase(value, { delimiter: "." });
}
