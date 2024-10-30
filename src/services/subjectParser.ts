import { Subject, SubjectWrapper } from "../models/subject";
import { Tag } from "../models/tag";
import { ModelParser } from "./modelParser";
import { Transformer } from "./modelParser";

export abstract class SubjectParser extends ModelParser<SubjectWrapper> {
  private static emittedTagArrayWarning = false;

  // we use "as const" here so that the type is inferred as a literal type
  // and can be inlined by bundlers. We then use "satisfies" to ensure that
  // the type is compatible with the Tag interface
  // if we typed this as a Tag, it would reduce the type from a constant to a
  // generic type, which would reduce linting and bundling optimizations
  private static defaultTag = { text: "" } as const satisfies Tag;

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
    if (subjectTag === null || subjectTag === undefined) {
      return SubjectParser.defaultTag;
    }

    const isTagString = typeof subjectTag === "string";
    if (isTagString) {
      return { text: subjectTag };
    }

    const isTagArray = subjectTag instanceof Array;
    if (isTagArray) {
      return SubjectParser.tagArrayParser(subjectTag as any[]);
    }

    // although arrays are objects, the condition above will catch arrays
    // and early return, so we can safely assume that if we reach this point
    // the value is an object
    const isTagObject = typeof subjectTag === "object";
    if (isTagObject) {
      return subjectTag as any;
    }

    const isSymbol = typeof subjectTag === "symbol";
    if (isSymbol) {
      // using toString() on a symbol
      return { text: subjectTag.toString() };
    }

    // the first guard of this function ensures that any value that gets to here
    // is not null or undefined, meaning that we should attempt to convert it to
    // a human readable format by calling toString()
    //
    // this case will be triggered if the value is an obscure type that we do
    // not expect a subject tag to be e.g. a function, bigint, symbol, etc...
    // this toString() call also handles numbers and booleans
    const tagText = subjectTag.toString();
    return { text: tagText };
  }

  private static tagArrayParser(subjectTags: unknown[]): Tag {
    if (subjectTags.length === 0) {
      return SubjectParser.defaultTag;
    }

    if (!SubjectParser.emittedTagArrayWarning) {
      console.warn("Received a subject model with a tag array. The only the first tag will be used.");
      SubjectParser.emittedTagArrayWarning = true;
    }

    // if we receive an array of tags, we only want to use the first one
    const firstTag = subjectTags[0];
    const tagModel = SubjectParser.tagParser(firstTag);
    return tagModel;
  }
}
