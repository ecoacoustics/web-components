import { DecisionOptions } from "../models/decisions/decision";
import { NewTag } from "../models/decisions/newTag";
import { Verification } from "../models/decisions/verification";
import { confirmedColumnName, newTagColumnName, Subject, SubjectWrapper } from "../models/subject";
import { Tag } from "../models/tag";
import { ModelParser } from "./modelParser";
import { Transformer } from "./modelParser";

/**
 * A callback that will be applied to every subjects url
 * this can be useful for adding authentication information
 */
export type UrlTransformer = (url: string, subject?: Subject) => string;

export abstract class SubjectParser extends ModelParser<SubjectWrapper> {
  private static emittedTagArrayWarning = false;

  // we use "as const" here so that the type is inferred as a literal type
  // and can be inlined by bundlers. We then use "satisfies" to ensure that
  // the type is compatible with the Tag interface
  // if we typed this as a Tag, it would reduce the type from a constant to a
  // generic type, which would reduce linting and bundling optimizations
  private static readonly defaultTag = null;

  public static parse(original: Subject, urlTransformer: UrlTransformer): SubjectWrapper {
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
      verification: SubjectParser.keyTransformer([
        "verified",
        "decision",
        "confirmed",
        "confirmation",
        confirmedColumnName,
      ]),
      newTag: SubjectParser.keyTransformer(["newTag", newTagColumnName]),
    };

    const partialModel = SubjectParser.deriveModel(original, transformer);

    const originalUrl = (partialModel.url as string) ?? "";
    const transformedUrl = urlTransformer(originalUrl, original);

    const tag = SubjectParser.tagParser(partialModel.tag);

    const subjectWrapper = new SubjectWrapper(original, transformedUrl, tag);

    const verification = SubjectParser.verificationParser(partialModel.verification);
    if (verification) {
      subjectWrapper.addDecision(verification);
    }

    return subjectWrapper;
  }

  private static tagParser(subjectTag: unknown): Tag | null {
    if (subjectTag === null || subjectTag === undefined) {
      return SubjectParser.defaultTag;
    }

    const isTagString = typeof subjectTag === "string";
    if (isTagString) {
      return { text: subjectTag };
    }

    if (Array.isArray(subjectTag)) {
      return SubjectParser.tagArrayParser(subjectTag);
    }

    // although arrays are objects, the condition above will catch arrays
    // and early return, so we can safely assume that if we reach this point
    // the value is an object
    const isTagObject = typeof subjectTag === "object";
    if (isTagObject) {
      return subjectTag as any;
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

  private static tagArrayParser(subjectTags: ReadonlyArray<unknown>): Tag | null {
    if (subjectTags.length === 0) {
      return SubjectParser.defaultTag;
    }

    if (!SubjectParser.emittedTagArrayWarning) {
      console.warn("Received a subject model with a tag array. Only the first tag will be used.");
      SubjectParser.emittedTagArrayWarning = true;
    }

    // if we receive an array of tags, we only want to use the first one
    const firstTag = subjectTags[0];
    const tagModel = SubjectParser.tagParser(firstTag);
    return tagModel;
  }

  private static verificationParser(subjectVerification: any): Verification | null {
    if (!subjectVerification) {
      return null;
    }

    let verificationState: DecisionOptions | string = subjectVerification?.confirmed;

    const verificationType = typeof subjectVerification;
    if (verificationType === "string") {
      // Local data sources will have a string value for the confirmed property.
      verificationState = subjectVerification;
    } else if (verificationType !== "object") {
      console.warn(`Invalid verification type. Expected 'object' or 'string'. Found '${verificationType}'`);
      return null;
    }

    const validDecisionOptions = Object.values(DecisionOptions);
    if (!validDecisionOptions.includes(verificationState)) {
      const joinedValidOptions = validDecisionOptions.join(", ");
      console.warn(
        `Invalid subject confirmed value. Expected '${joinedValidOptions}'. Found '${subjectVerification.confirmed}'`,
      );

      return null;
    }

    return new Verification(verificationState as DecisionOptions, subjectVerification.tag ?? SubjectParser.defaultTag);
  }

  private static newTagParser(subjectNewTag: any): NewTag | null {
    if (!subjectNewTag) {
      return null;
    }

    return subjectNewTag;
  }
}
