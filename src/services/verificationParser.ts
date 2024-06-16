import { Verification, VerificationSubject } from "../models/verification";
import { ModelParser } from "./modelParser";
import { Transformer } from "./modelParser";

export abstract class VerificationParser extends ModelParser<Verification> {
  public static parse(original: VerificationSubject) {
    const transformer: Transformer = {
      url: VerificationParser.keyTransformer(["src", "url", "AudioLink"]),
      tag: VerificationParser.keyTransformer(["tags", "tag", "label", "classification"]),
    };

    const partialModel = VerificationParser.deriveModel(original, transformer);

    // TODO: fix this typing
    return new Verification({
      subject: original,
      confirmed: false,
      additionalTags: [],
      ...partialModel,
    } as any);
  }
}
