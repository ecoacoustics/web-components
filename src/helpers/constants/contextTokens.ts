// we have split the context tokens into a separate file so that they can be
// imported in esm and cjs modules without importing any other modules
//
// we used to have these context tokens bundled with their context providers
// however, this would result in the some custom elements being defined when we
// only imported the context tokens. This was because all immediately executable
// code would be executed when the context token bundle was imported

import { createContext } from "@lit/context";
import { VerificationGridInjector, VerificationGridSettings } from "verification-grid/verification-grid";
import { VerificationGridTileContext } from "verification-grid-tile/verification-grid-tile";

export interface IRootContext {
  log: (message: string) => void;
}

// we use strings here instead of symbols so that users can use these contexts
// across different bundles / dynamic imports
// if the context tokens were symbols, they would have different references
// across different bundles and dynamic imports
export const gridTileContext = createContext<VerificationGridTileContext>("oe-grid-tile-context");
export const rootContext = createContext<IRootContext>("oe-root-context");

export const verificationGridContext = createContext<VerificationGridSettings>("oe-verification-grid-context");
export const injectionContext = createContext<VerificationGridInjector>("oe-injection-context");
