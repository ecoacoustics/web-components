import { Hertz, MHertz } from "../models/unitConverters";

export function hertzToMHertz(hertz: Hertz): MHertz {
  return hertz / 1_000;
}
