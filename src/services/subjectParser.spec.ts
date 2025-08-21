import { NewTag } from "../models/decisions/newTag";
import { Verification } from "../models/decisions/verification";
import { newTagColumnName, Subject, tagColumnName } from "../models/subject";
import { Tag } from "../models/tag";
import { test } from "../tests/assertions";
import { SubjectParser } from "./subjectParser";

interface VerificationParserTest {
  name: string;
  input: Subject;
  expectedTag: Tag | null;
  expectedVerified: Verification | undefined;
  expectedNewTag: NewTag | undefined;
  expectedUrl?: string;
}

const tests: VerificationParserTest[] = [
  {
    name: "empty subject",
    input: {},
    expectedUrl: "",
    expectedTag: null,
    expectedNewTag: undefined,
    expectedVerified: undefined,
  },
  {
    name: "subject with a string tag",
    input: {
      src: "http://localhost:3000/example.flac",
      tags: "bird",
    },
    expectedUrl: "http://localhost:3000/example.flac",
    expectedTag: { text: "bird" },
    expectedNewTag: undefined,
    expectedVerified: undefined,
  },
  {
    // I have chosen to test the number zero here because it is a falsy value
    // meaning that it shouldn't be caught by the null/undefined check to use
    // the default tag
    name: "subject with a falsy number tag",
    input: {
      tags: 0,
    },
    expectedTag: { text: "0" },
    expectedNewTag: undefined,
    expectedVerified: undefined,
  },
  {
    name: "subject with a number tag",
    input: {
      tags: 123,
    },
    expectedTag: { text: "123" },
    expectedNewTag: undefined,
    expectedVerified: undefined,
  },
  {
    name: "subject with a boolean tag",
    input: {
      tags: true,
    },
    expectedTag: { text: "true" },
    expectedNewTag: undefined,
    expectedVerified: undefined,
  },
  {
    name: "subject with a null tag",
    input: {
      tags: null,
    },
    expectedTag: null,
    expectedNewTag: undefined,
    expectedVerified: undefined,
  },
  {
    name: "subject with an undefined tag",
    input: {
      tags: undefined,
    },
    expectedTag: null,
    expectedNewTag: undefined,
    expectedVerified: undefined,
  },
  {
    name: "subject with an empty string tag",
    input: {
      tags: "",
    },
    // Note that unlike the other tests where "null" is used for missing values,
    // if a tag with explicitly no text is passed in, we pass through the tag
    // without modification.
    expectedTag: { text: "" },
    expectedNewTag: undefined,
    expectedVerified: undefined,
  },
  {
    // I do not expect that users will pass in a symbol as a tag, but I have
    // included this test to show that the parser can handle it
    name: "subject with a symbol tag",
    input: {
      tags: Symbol("bird"),
    },
    expectedTag: { text: "Symbol(bird)" },
    expectedNewTag: undefined,
    expectedVerified: undefined,
  },
  {
    name: "array of string tags",
    input: {
      tags: ["bird", "sparrow", "finch"],
    },
    expectedTag: { text: "bird" },
    expectedNewTag: undefined,
    expectedVerified: undefined,
  },
  {
    name: "subject with an array of object tags",
    input: {
      tags: [{ text: "bird" }, { text: "sparrow" }, { text: "finch" }],
    },
    expectedTag: { text: "bird" },
    expectedNewTag: undefined,
    expectedVerified: undefined,
  },
  {
    name: "array of tag object and strings",
    input: {
      tags: ["bird", { text: "sparrow" }, "finch"],
    },
    expectedTag: { text: "bird" },
    expectedNewTag: undefined,
    expectedVerified: undefined,
  },
  {
    name: "nested array of tag objects",
    input: {
      tags: [
        // prettier wants to inline this all on one line. However, I think that
        // a one line object with nested arrays is hard to read
        // I have therefore disabled prettier for these nested objects
        // @prettier-ignore
        [{ text: "nest" }, { text: "tree" }],
        { text: "bird" },
      ],
    },
    expectedTag: { text: "nest" },
    expectedNewTag: undefined,
    expectedVerified: undefined,
  },
  {
    name: "nested array of tag objects and strings",
    input: {
      tags: [
        // @prettier-ignore
        [{ text: "tree" }, "nest"],
        "bird",
        { text: "sparrow" },
        "finch",
      ],
    },
    expectedTag: { text: "tree" },
    expectedNewTag: undefined,
    expectedVerified: undefined,
  },
  {
    name: "empty array of tags",
    input: {
      tags: [],
    },
    expectedTag: null,
    expectedNewTag: undefined,
    expectedVerified: undefined,
  },
  {
    name: "nested empty array of tags",
    input: {
      tags: [[]],
    },
    expectedTag: null,
    expectedNewTag: undefined,
    expectedVerified: undefined,
  },
  {
    name: "subject with a positive verification and no tag",
    input: {
      src: "http://localhost:3000/example.flac",
      verified: "true",
    },
    expectedUrl: "http://localhost:3000/example.flac",
    expectedVerified: new Verification("true" as any, { text: "" }),
    expectedNewTag: undefined,
    expectedTag: null,
  },
  {
    name: "subject with a verification",
    input: {
      src: "http://localhost:3000/example.flac",
      verified: "true",
      [tagColumnName]: "dugong",
      tags: [{ text: "abbots babbler" }, { text: "dugong" }],
    },
    expectedUrl: "http://localhost:3000/example.flac",
    expectedTag: { text: "abbots babbler" },
    expectedVerified: new Verification("true" as any, { text: "dugong" }),
    expectedNewTag: undefined,
  },
  {
    name: "subject with a negative verification",
    input: {
      verified: "false",
      tags: [{ text: "abbots babbler" }],
    },
    expectedTag: { text: "abbots babbler" },
    // Note that because there is no oe_tag column, and there is no tag in the
    // verification object.
    // In this case, we use an empty tag as a placeholder.
    // This is different from a "null" tag which would result in the subject
    // wrappers tag being used.
    // I have preferred to use an empty tag here instead of the subjects tag so
    // that if the user changes the tag on the subject, the tag that the
    // verification was originally attached to is not incorrect.
    // I would rather have an empty tag than a tag that is incorrect.
    expectedVerified: new Verification("false" as any, { text: "" }),
    expectedNewTag: undefined,
  },
  {
    name: "subject with an unsure verification",
    input: {
      verified: "unsure",
      tags: [{ text: "abbots babbler" }],
      oe_tag: "dugong",
    },
    expectedTag: { text: "abbots babbler" },
    // Note that this tag doesn't actually exist in the subjects tags.
    // This is mimicking a situation where the user has deleted the original tag
    // that was verified, but the verification history still exists.
    expectedVerified: new Verification("unsure" as any, {
      text: "dugong",
    }),
    expectedNewTag: undefined,
  },
  {
    name: "subject with a skip verification",
    input: {
      verified: "skip",
      tags: [{ text: "abbots babbler" }],
      [tagColumnName]: "Big Bird",
    },
    expectedTag: { text: "abbots babbler" },
    expectedVerified: new Verification("skip" as any, {
      text: "Big Bird",
    }),
    expectedNewTag: undefined,
  },
  {
    name: "subject with a verified object",
    input: {
      verified: {
        // Note that we use "correct" instead of "true" here to test that we can
        // handle confirmed states that do not exactly match our DecisionOptions
        // enum.
        confirmed: "correct",
        tag: { text: "dugong" },
        // Note that our verification objects don't have additionalData, so this
        // is testing that we can correctly ignore additional properties from
        // the host application.
        additionalData: "some data",
      },
    },
    expectedVerified: new Verification("true" as any, { text: "dugong" }),
    expectedTag: null,
    expectedNewTag: undefined,
  },
  {
    name: "subject with a negative verification object",
    input: {
      verified: {
        confirmed: "incorrect",
        additionalData: true,
        tag: { text: "dolphin" },
      },
    },
    expectedTag: null,
    expectedVerified: new Verification("false" as any, { text: "dolphin" }),
    expectedNewTag: undefined,
  },
  {
    name: "subject with a new tag string",
    input: {
      newTag: "oscar",
    },
    expectedTag: null,
    expectedNewTag: new NewTag("true" as any, { text: "oscar" }),
    expectedVerified: undefined,
  },
  {
    name: "subject with new tag string from local data source download",
    input: {
      [newTagColumnName]: "big-bird",
    },
    expectedTag: null,
    expectedNewTag: new NewTag("true" as any, { text: "big-bird" }),
    expectedVerified: undefined,
  },
  {
    name: "subject with a new tag object",
    input: {
      newTag: { confirmed: "true", tag: { text: "elmo" } },
    },
    // Even though we have specified a new tag, we do not expect the new tag to
    // be emitted in the subjects tag property.
    expectedTag: null,
    expectedVerified: undefined,
    expectedNewTag: new NewTag("true" as any, { text: "elmo" }),
  },
];

test.describe("SubjectParser", () => {
  for (const testItem of tests) {
    const result = SubjectParser.parse(testItem.input, (url) => url);

    test(`should have correct tag for a ${testItem.name}`, () => {
      test.expect(result.tag).toEqual(testItem.expectedTag);
    });

    test(`should have correct verified value for a ${testItem.name}`, () => {
      test.expect(result.verification).toEqual(testItem.expectedVerified);
    });

    test(`should have correct new tag for a ${testItem.name}`, () => {
      test.expect(result.newTag).toEqual(testItem.expectedNewTag);
    });

    if ("expectedUrl" in testItem) {
      test(`should have correct url for a ${testItem.name}`, () => {
        test.expect(result.url).toEqual(testItem.expectedUrl);
      });
    }
  }
});
