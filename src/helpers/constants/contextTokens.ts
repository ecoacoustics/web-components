import { createContext } from "@lit/context";
import { SubjectWrapper } from "../../models/subject";
import { VerificationGridInjector, VerificationGridSettings } from "verification-grid/verification-grid";

export interface IRootContext {
  log: (message: string) => void;
}

export const gridTileContext = createContext<SubjectWrapper>(Symbol("grid-tile-context"));
export const rootContext = createContext<IRootContext>(Symbol("rootContext"));

export const verificationGridContext = createContext<VerificationGridSettings>(Symbol("verification-grid-context"));
export const injectionContext = createContext<VerificationGridInjector>(Symbol("injection-context"));
