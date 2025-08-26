import { DecisionOptions } from "../models/decisions/decision";
import { NewTag } from "../models/decisions/newTag";
import { Verification } from "../models/decisions/verification";
import { confirmedColumnName, newTagColumnName, Subject, SubjectWrapper, tagColumnName } from "../models/subject";
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
        "verification",
        "decision",
        "confirmed",
        "confirmation",
        confirmedColumnName,
      ]),
      newTag: SubjectParser.keyTransformer(["newTag", newTagColumnName]),
      // When parsing a subjects previous verification decisions, we use the
      // "oe_tag" column's value as the tag that was verified.
      // This allows the user to modify the tag column in the subject without
      // breaking the verification history.
      // Additionally, it means that if we change how we parse the tag column,
      // it will not be a breaking change for verification history parsing.
      oeTag: [tagColumnName],
    };

    const partialModel = SubjectParser.deriveModel(original, transformer);

    const originalUrl = (partialModel.url as string) ?? "";
    const transformedUrl = urlTransformer(originalUrl, original);

    const tag = SubjectParser.tagParser(partialModel.tag);

    const subjectWrapper = new SubjectWrapper(original, transformedUrl, tag);

    const verification = SubjectParser.verificationParser(partialModel);
    if (verification) {
      subjectWrapper.addDecision(verification);
    }

    const newTag = SubjectParser.newTagParser(partialModel.newTag);
    if (newTag) {
      subjectWrapper.addDecision(newTag);
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

  private static verificationParser(partialModel: any): Verification | null {
    const subjectVerification = partialModel.verification;
    const unparsedOeTag = partialModel.oeTag;
    if (subjectVerification === undefined || subjectVerification === null || subjectVerification === "") {
      return null;
    }

    const verificationType = typeof subjectVerification;
    if (verificationType !== "object" && verificationType !== "string" && verificationType !== "boolean") {
      console.warn(`Invalid verification type. Expected 'object', 'string', or 'boolean'. Found '${verificationType}'`);
      return null;
    }

    // Local data sources will have a string value for the confirmed property.
    // The verified state can be a boolean when using a callback that returns a
    // boolean.
    let verificationState: unknown =
      verificationType === "string" || verificationType === "boolean"
        ? subjectVerification
        : subjectVerification?.confirmed;

    const confirmedMapping = new Map<unknown, DecisionOptions>([
      ["true", DecisionOptions.TRUE],
      ["false", DecisionOptions.FALSE],
      ["skip", DecisionOptions.SKIP],
      ["unsure", DecisionOptions.UNSURE],

      ["confirmed", DecisionOptions.TRUE],
      ["correct", DecisionOptions.TRUE],
      ["incorrect", DecisionOptions.FALSE],

      [true, DecisionOptions.TRUE],
      [false, DecisionOptions.FALSE],
    ]);

    const mappedConfirmedState = confirmedMapping.get(verificationState);
    if (mappedConfirmedState === undefined) {
      console.warn(
        `Invalid subject confirmed value. Expected one of ${Array.from(confirmedMapping.keys()).join(", ")}. Found '${verificationState}'`,
      );
      return null;
    } else {
      verificationState = mappedConfirmedState;
    }

    const validDecisionOptions = Object.values(DecisionOptions);
    if (!validDecisionOptions.includes(verificationState)) {
      const joinedValidOptions = validDecisionOptions.join(", ");
      console.warn(
        `Invalid subject confirmed value. Expected '${joinedValidOptions}'. Found '${subjectVerification.confirmed}'`,
      );

      return null;
    }

    // If there is a tag on the verification object, we use that as the source
    // of truth.
    // However, if there is no tag on the verification object, we try to use the
    // oe_tag column as the tag that was verified.
    // Note that we do never fallback to using the subjects "tag" column as we
    // would prefer to omit the verification decision rather than associate it
    // with an incorrect tag.
    const verifiedTag = subjectVerification?.tag ?? SubjectParser.tagParser(unparsedOeTag) ?? null;
    if (verifiedTag === null) {
      console.warn("Could not determine tag for verification decision. The verification will be ignored.");
      return null;
    }

    return new Verification(verificationState as DecisionOptions, verifiedTag);
  }

  private static newTagParser(subjectNewTag: any): NewTag | null {
    // Note that we use a "falsy" assertion here so that empty string will be
    // treated as a missing "newTag".
    // This can occur when using a partially complete local data source.
    if (!subjectNewTag) {
      return null;
    }

    const tag = typeof subjectNewTag === "string" ? SubjectParser.tagParser(subjectNewTag) : subjectNewTag.tag;
    const newTagModel = new NewTag(subjectNewTag.confirmed ?? DecisionOptions.TRUE, tag);

    return newTagModel;
  }
}
