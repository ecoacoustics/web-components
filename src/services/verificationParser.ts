import { DecisionWrapper, VerificationSubject } from "../models/verification";
import { ModelParser } from "./modelParser";
import { Transformer } from "./modelParser";

export abstract class VerificationParser extends ModelParser<DecisionWrapper> {
  public static parse(original: VerificationSubject): DecisionWrapper {
    const transformer: Transformer = {
      url: VerificationParser.keyTransformer(["src", "url", "AudioLink"]),
      tag: VerificationParser.keyTransformer(["tags", "tag", "label", "classification"]),
    };

    const partialModel = VerificationParser.deriveModel(original, transformer);

    // TODO: fix this typing
    return new DecisionWrapper({
      subject: original,
      confirmed: false,
      additionalTags: [],
      ...partialModel,
    } as any);
  }
}
