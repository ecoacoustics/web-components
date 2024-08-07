import { Subject, SubjectWrapper } from "../models/subject";
import { Tag } from "../models/tag";
import { ModelParser } from "./modelParser";
import { Transformer } from "./modelParser";

export abstract class SubjectParser extends ModelParser<SubjectWrapper> {
  public static parse(original: Subject): SubjectWrapper {
    const transformer: Transformer = {
      url: SubjectParser.keyTransformer(["src", "url", "audioLink"]),
      tag: SubjectParser.keyTransformer([
        // Common name formats
        "tags",
        "tag",
        "label",
        "classification",

        // Raven format
        "species",

        // BirdNet format
        "scientificName",
        "commonName",

        // Ecosounds annotation download formats
        "commonNameTags",
        "speciesNameTags",
      ]),
    };

    const partialModel = SubjectParser.deriveModel(original, transformer);

    const url = (partialModel.url as string) ?? "";
    const tag = (partialModel.tag as Tag) ?? { text: "" };

    return new SubjectWrapper(original as Subject, url, tag);
  }
}
