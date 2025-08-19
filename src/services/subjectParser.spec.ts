import { NewTag } from "../models/decisions/newTag";
import { Verification } from "../models/decisions/verification";
import { newTagColumnName, Subject } from "../models/subject";
import { Tag } from "../models/tag";
import { test } from "../tests/assertions";
import { SubjectParser } from "./subjectParser";

interface VerificationParserTest {
  name: string;
  input: Subject;
  expectedUrl?: string;
  expectedTag?: Tag | null;
  expectedVerified?: Verification;
  expectedNewTag?: NewTag;
}

const tests: VerificationParserTest[] = [
  {
    name: "empty subject",
    input: {},
    expectedUrl: "",
    expectedTag: null,
  },
  {
    name: "subject with a string tag",
    input: {
      src: "https://www.testing.com",
      tags: "bird",
    },
    expectedUrl: "https://www.testing.com",
    expectedTag: { text: "bird" },
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
  },
  {
    name: "subject with a number tag",
    input: {
      tags: 123,
    },
    expectedTag: { text: "123" },
  },
  {
    name: "subject with a boolean tag",
    input: {
      tags: true,
    },
    expectedTag: { text: "true" },
  },
  {
    name: "subject with a null tag",
    input: {
      tags: null,
    },
    expectedTag: null,
  },
  {
    name: "subject with an undefined tag",
    input: {
      tags: undefined,
    },
    expectedTag: null,
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
  },
  {
    // I do not expect that users will pass in a symbol as a tag, but I have
    // included this test to show that the parser can handle it
    name: "subject with a symbol tag",
    input: {
      tags: Symbol("bird"),
    },
    expectedTag: { text: "Symbol(bird)" },
  },
  {
    name: "array of string tags",
    input: {
      tags: ["bird", "sparrow", "finch"],
    },
    expectedTag: { text: "bird" },
  },
  {
    name: "subject with an array of object tags",
    input: {
      tags: [{ text: "bird" }, { text: "sparrow" }, { text: "finch" }],
    },
    expectedTag: { text: "bird" },
  },
  {
    name: "array of tag object and strings",
    input: {
      tags: ["bird", { text: "sparrow" }, "finch"],
    },
    expectedTag: { text: "bird" },
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
  },
  {
    name: "empty array of tags",
    input: {
      tags: [],
    },
    expectedTag: null,
  },
  {
    name: "nested empty array of tags",
    input: {
      tags: [[]],
    },
    expectedTag: null,
  },
  {
    name: "subject with a verified state and no tag",
    input: {
      src: "https://www.testing.com",
      verified: "true",
    },
    expectedUrl: "https://www.testing.com",
    expectedVerified: new Verification("true" as any, null),
  },
  {
    name: "subject with a verified state",
    input: {
      src: "https://www.testing.com",
      verified: "true",
      tags: [{ text: "abbots babbler" }],
    },
    expectedUrl: "https://www.testing.com",
    expectedTag: { text: "abbots babbler" },
    expectedVerified: new Verification("true" as any, null),
  },
  {
    name: "subject with a negative verified state and no tag",
    input: {
      verified: "false",
      tags: [{ text: "abbots babbler" }],
    },
    expectedTag: { text: "abbots babbler" },
    expectedVerified: new Verification("false" as any, null),
  },
  {
    name: "subject with an unsure state and no tag",
    input: {
      verified: "unsure",
      tags: [{ text: "abbots babbler" }],
    },
    expectedTag: { text: "abbots babbler" },
    expectedVerified: new Verification("unsure" as any, null),
  },
  {
    name: "subject with a skip state and no tag",
    input: {
      verified: "skip",
      tags: [{ text: "abbots babbler" }],
    },
    expectedTag: { text: "abbots babbler" },
    expectedVerified: new Verification("skip" as any, {
      text: "abbots babbler",
    }),
  },
  {
    name: "subject with a verified object",
    input: {
      verified: {
        // Note that we use "correct" instead of "true" here to test that we can
        // handle confirmed states that do not exactly match our DecisionOptions
        // enum.
        confirmed: "correct",
        // Note that our verification objects don't have additionalData, so this
        // is testing that we can correctly ignore additional properties from
        // the host application.
        additionalData: "some data",
      },
    },
    expectedVerified: new Verification("true" as any, null),
  },
  {
    name: "subject with a negative verification object",
    input: {
      verified: {
        // Note that we use "correct" instead of "true" here to test that we can
        // handle confirmed states that do not exactly match our DecisionOptions
        // enum.
        confirmed: "incorrect",
        additionalData: true,
      },
    },
    expectedVerified: new Verification("false" as any, null),
  },
  {
    name: "subject with a new tag string",
    input: {
      newTag: "oscar",
    },
  },
  {
    name: "subject with new tag string from local data source download",
    input: {
      [newTagColumnName]: "big-bird",
    },
  },
  {
    name: "subject with a new tag object",
    input: {
      newTag: { confirmed: "true", tag: { text: "elmo" } },
    },
    // Even though we have specified a new tag, we do not expect the new tag to
    // be emitted in the subjects tag property.
    expectedTag: null,
    expectedNewTag: new NewTag("true" as any, { text: "elmo" }),
  },
];

test.describe("SubjectParser", () => {
  for (const testItem of tests) {
    const result = SubjectParser.parse(testItem.input, (url) => url);

    if ("expectedUrl" in testItem) {
      test(`should have the correct url for a ${testItem.name}`, () => {
        test.expect(result.url).toEqual(testItem.expectedUrl);
      });
    }

    if ("expectedTag" in testItem) {
      test(`should have the correct tag for a ${testItem.name}`, () => {
        test.expect(result.tag).toEqual(testItem.expectedTag);
      });
    }
  }
});
