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

    const tag: Tag = SubjectParser.tagParser(partialModel.tag);

    return new SubjectWrapper(original as Subject, url, tag);
  }

  private static tagParser(subjectTag: any): Tag {
    const isTagString = typeof subjectTag === "string";
    if (isTagString) {
      return { text: subjectTag };
    }

    const isTagArray = subjectTag instanceof Array;
    if (isTagArray) {
      return SubjectParser.tagArrayParser(subjectTag as any[]);
    }

    const isTagObject = typeof subjectTag === "object";
    if (isTagObject) {
      return subjectTag as any;
    }

    const defaultTag = { text: "" };
    return defaultTag;
  }

  private static tagArrayParser(subjectTags: any[]): Tag {
    const tagText = subjectTags.map((tagModel) => tagModel.text).join(", ");
    return { text: tagText };
  }
}
